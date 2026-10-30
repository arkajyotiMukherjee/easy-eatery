import { randomBytes, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { AccessError, tokenHash, type Identity, type PostgresRepository, type Scope } from './database.ts';
import { WebpaySandbox, type SandboxAttempt, type SandboxStatus } from '../integrations/webpay.ts';
import { DomainError } from '../platform/domain.ts';

const conflict = () => Object.assign(new Error('Sandbox payment requires review.'), { statusCode: 409 });
const redact = (row: any) => ({ id: row.id, orderId: row.order_id, state: row.state === 'creating' && row.claim_until < new Date() ? 'needs_attention' : row.state, revision: row.revision, refundStarted: row.refund_started, environment: 'integration', amount: row.amount, currency: row.currency, expiresAt: row.expires_at.toISOString(), updatedAt: row.updated_at.toISOString() });

// Explicit staff-assisted sandbox workflow. No production payment/POS authority.
export class SandboxPayments {
  constructor(readonly repository: PostgresRepository, private readonly gateway: WebpaySandbox) {}

  list(identity: Identity) {
    return this.repository.transaction(identity, 'sandbox.attempts.read', async (_state, client) => {
      const result = await client.query('SELECT * FROM sandbox_attempts WHERE tenant_id=$1 AND branch_id=$2 ORDER BY created_at DESC LIMIT 100', [identity.tenantId, identity.branchId]);
      return { attempts: result.rows.map(redact), limit: 100 };
    });
  }

  async create(identity: Identity, orderId: string) {
    const claim = randomUUID();
    const link = randomBytes(32).toString('base64url');
    const selected = await this.repository.transaction(identity, 'sandbox.checkout', async (state, client) => {
      const order = state.order(orderId);
      if (order.paymentMethod !== 'webpay_sandbox' || order.fulfillment !== 'local' || order.paymentState !== 'due' || order.status !== 'awaiting_payment') throw new DomainError('transition');
      state.assertOrderingAvailable();
      const scope = [identity.tenantId, identity.branchId];
      const existing = await client.query('SELECT * FROM sandbox_attempts WHERE tenant_id=$1 AND branch_id=$2 AND order_id=$3', [...scope, orderId]);
      if (existing.rows.length) {
        const row = existing.rows[0];
        this.checkMerchant(row);
        if (row.state === 'ready' && row.expires_at > new Date()) {
          await client.query('UPDATE sandbox_attempts SET link_hash=$2,revision=revision+1,updated_at=now() WHERE id=$1', [row.id, tokenHash(link)]);
          row.revision++;
          return { row, create: false, link: true };
        }
        if (row.state === 'creating' && row.claim_until < new Date()) {
          const parked = await client.query("UPDATE sandbox_attempts SET state='needs_attention',claim_id=NULL,claim_until=NULL,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *",[row.id]);
          return { row: parked.rows[0], create: false, link: false };
        }
        return { row, create: false, link: false };
      }
      const id = randomUUID();
      const result = await client.query(`INSERT INTO sandbox_attempts(id,tenant_id,branch_id,order_id,commerce_code,buy_order,session_id,amount,currency,state,expires_at,claim_id,claim_until)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,'CLP','creating',now()+interval '15 minutes',$9,now()+interval '30 seconds') RETURNING *`,
      [id, ...scope, orderId, this.gateway.merchantCode, id.replaceAll('-', '').slice(0, 26), randomUUID(), order.total, claim]);
      return { row: result.rows[0], create: true, link: false };
    });
    if (!selected.create) return { ...redact(selected.row), ...(selected.link ? { checkoutPath: `/sandbox/checkout/${link}` } : {}) };
    const row = selected.row;
    try {
      const result = await this.gateway.create({ buyOrder: row.buy_order, sessionId: row.session_id, amount: row.amount, currency: 'CLP' });
      const saved = await this.lock(row, async client => {
        const update = await client.query(`UPDATE sandbox_attempts SET state='ready',provider_token=$3,token_hash=$4,link_hash=$5,claim_id=NULL,claim_until=NULL,revision=revision+1,updated_at=now() WHERE id=$1 AND claim_id=$2 RETURNING *`, [row.id, claim, result.attempt.token, tokenHash(result.attempt.token), tokenHash(link)]);
        return update.rows[0];
      });
      if (!saved) throw conflict();
      return { ...redact(saved), checkoutPath: `/sandbox/checkout/${link}` };
    } catch {
      await this.fail(row, claim);
      throw conflict();
    }
  }

  async handoff(link: string) {
    if (!/^[\w-]{43}$/.test(link)) throw new AccessError();
    const result = await this.repository.pool.query("SELECT * FROM sandbox_attempts WHERE link_hash=$1 AND state='ready' AND expires_at > now()", [tokenHash(link)]);
    const row = result.rows[0];
    if (!row) throw new AccessError();
    this.checkMerchant(row);
    return { token: row.provider_token as string, amount: row.amount as number };
  }

  // The unguessable provider token identifies an existing durable attempt. The browser
  // cannot supply an order, amount, merchant or payment result to this operation.
  async returned(token: string, cancelled = false) {
    if (!/^[\w-]{1,64}$/.test(token)) throw new AccessError();
    const result = await this.repository.pool.query('SELECT * FROM sandbox_attempts WHERE token_hash=$1', [tokenHash(token)]);
    if (!result.rows[0]) throw new AccessError();
    return this.observe(result.rows[0], cancelled ? 'status' : 'commit');
  }

  async reconcile(identity: Identity, id: string) {
    const row = await this.repository.transaction(identity, 'sandbox.reconcile', async (_state, client) => {
      const result = await client.query('SELECT * FROM sandbox_attempts WHERE id=$1 AND tenant_id=$2 AND branch_id=$3', [id, identity.tenantId, identity.branchId]);
      if (!result.rows[0]) throw new AccessError(403);
      return result.rows[0];
    });
    return this.observe(row, 'status');
  }

  async reverse(identity: Identity, id: string, expectedVersion: number) {
    const claim = randomUUID();
    const row = await this.repository.transaction(identity,'sandbox.reverse',async(state,client)=>{
      const result = await client.query('SELECT * FROM sandbox_attempts WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 FOR UPDATE',[id,identity.tenantId,identity.branchId]);
      const row = result.rows[0];
      if (!row) throw new AccessError(403);
      this.checkMerchant(row);
      const order = state.order(row.order_id);
      if (row.revision !== expectedVersion || row.refund_started || row.state !== 'authorized' || !row.provider_token || order.paymentState !== 'sandbox_authorized' || order.status === 'collected' || (row.claim_until && row.claim_until > new Date())) throw conflict();
      const update = await client.query("UPDATE sandbox_attempts SET state='committing',refund_started=true,claim_id=$2,claim_until=now()+interval '30 seconds',revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *",[id,claim]);
      order.paymentState='sandbox_review'; // Blocks preparation/collection while reversal is uncertain.
      return update.rows[0];
    });
    const expected:SandboxAttempt={buyOrder:row.buy_order,sessionId:row.session_id,amount:row.amount,currency:'CLP',token:row.provider_token,environment:'integration'};
    try {
      await this.gateway.reverse(expected);
      return await this.apply(row,claim,await this.gateway.status(expected));
    } catch {
      await this.fail(row,claim);
      throw conflict();
    }
  }

  private checkMerchant(row: any) {
    if (row.environment !== 'integration' || row.commerce_code !== this.gateway.merchantCode) throw conflict();
  }

  private async observe(row: any, mode: 'commit' | 'status') {
    this.checkMerchant(row);
    const claim = randomUUID();
    const selected = await this.lock(row, async client => {
      const result = await client.query('SELECT * FROM sandbox_attempts WHERE id=$1 FOR UPDATE', [row.id]);
      const current = result.rows[0];
      if (!current.provider_token) {
        if (current.state === 'creating' && current.claim_until < new Date()) {
          const parked=await client.query("UPDATE sandbox_attempts SET state='needs_attention',claim_id=NULL,claim_until=NULL,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *",[current.id]);
          return { row:parked.rows[0],run:false };
        }
        return { row: current, run: false };
      }
      if (current.claim_until && current.claim_until > new Date()) return { row: current, run: false };
      // A browser replay can never commit twice, even after a crashed process.
      if (mode === 'commit' && (current.commit_started || current.state !== 'ready')) return { row: current, run: false };
      await client.query("UPDATE sandbox_attempts SET state='committing',claim_id=$2,claim_until=now()+interval '30 seconds',commit_started=commit_started OR $3,revision=revision+1,updated_at=now() WHERE id=$1", [row.id, claim, mode === 'commit']);
      current.commit_started ||= mode === 'commit';
      return { row: current, run: true };
    });
    if (!selected.run) return redact(selected.row);
    const current = selected.row;
    const expected: SandboxAttempt = { buyOrder: current.buy_order, sessionId: current.session_id, amount: current.amount, currency: 'CLP', token: current.provider_token, environment: 'integration' };
    try {
      const status = mode === 'commit' ? await this.gateway.commit(expected) : await this.gateway.status(expected);
      return await this.apply(current, claim, status);
    } catch {
      await this.fail(current, claim);
      throw conflict();
    }
  }

  private async apply(row: any, claim: string, status: SandboxStatus) {
    return this.lock(row, async client => {
      const result = await client.query('SELECT * FROM sandbox_attempts WHERE id=$1 AND claim_id=$2 FOR UPDATE', [row.id, claim]);
      if (!result.rows[0]) throw conflict();
      const orderResult = await client.query('SELECT * FROM orders WHERE tenant_id=$1 AND branch_id=$2 AND id=$3 FOR UPDATE', [row.tenant_id, row.branch_id, row.order_id]);
      const order = orderResult.rows[0];
      if (!order || order.payment_method !== 'webpay_sandbox' || order.fulfillment !== 'local' || order.total !== row.amount || order.currency !== row.currency) throw conflict();
      let state = status.testAuthorized ? 'authorized' : ['REVERSED','NULLIFIED'].includes(status.status) ? 'reversed' : status.status === 'FAILED' ? 'declined' : status.status === 'INITIALIZED' && !row.commit_started ? 'ready' : 'needs_attention';
      if (status.status === 'PARTIALLY_NULLIFIED' && order.payment_state !== 'sandbox_reversed') {
        state = 'needs_attention';
        await client.query("UPDATE orders SET payment_state='sandbox_review' WHERE tenant_id=$1 AND branch_id=$2 AND id=$3", [row.tenant_id,row.branch_id,row.order_id]);
      } else if (row.refund_started && state !== 'reversed') {
        // AUTHORIZED after an uncertain reversal is not proof the reversal failed.
        state = 'needs_attention';
      } else if (status.testAuthorized && order.payment_state !== 'sandbox_reversed') {
        await client.query(`UPDATE orders SET payment_state='sandbox_authorized',payment_reference=$4,status=CASE WHEN status='awaiting_payment' THEN 'preparing' ELSE status END
          WHERE tenant_id=$1 AND branch_id=$2 AND id=$3`, [row.tenant_id,row.branch_id,row.order_id,`webpay-sandbox-${row.id}`]);
        await client.query(`INSERT INTO outbox(tenant_id,branch_id,event_key,event_type,order_id,payload) VALUES($1,$2,$3,'sandbox.test_authorized',$4,$5) ON CONFLICT DO NOTHING`, [row.tenant_id,row.branch_id,`sandbox-authorized:${row.id}`,row.order_id,JSON.stringify({ orderId: row.order_id, environment: 'integration', amount: row.amount, currency: 'CLP' })]);
      } else if (state === 'reversed' && ['sandbox_authorized','sandbox_review'].includes(order.payment_state)) {
        await client.query("UPDATE orders SET payment_state='sandbox_reversed' WHERE tenant_id=$1 AND branch_id=$2 AND id=$3", [row.tenant_id,row.branch_id,row.order_id]);
      } else if (order.payment_state === 'sandbox_authorized' && state !== 'authorized') {
        // Preserve the original authorization evidence and pause fulfillment
        // while a contradictory current observation requires review.
        state = 'needs_attention';
        await client.query("UPDATE orders SET payment_state='sandbox_review' WHERE tenant_id=$1 AND branch_id=$2 AND id=$3", [row.tenant_id,row.branch_id,row.order_id]);
      } else if (order.payment_state === 'sandbox_reversed') state = 'reversed';
      const update = await client.query('UPDATE sandbox_attempts SET state=$3,claim_id=NULL,claim_until=NULL,revision=revision+1,updated_at=now() WHERE id=$1 AND claim_id=$2 RETURNING *', [row.id,claim,state]);
      await client.query('INSERT INTO audit_events(tenant_id,branch_id,actor_id,action) VALUES($1,$2,$3,$4)', [row.tenant_id,row.branch_id,'webpay-sandbox',`sandbox.${state}:${row.id}`]);
      return redact(update.rows[0]);
    });
  }

  private fail(row: any, claim: string) {
    return this.lock(row, async client => {
      await client.query("UPDATE sandbox_attempts SET state='needs_attention',claim_id=NULL,claim_until=NULL,revision=revision+1,updated_at=now() WHERE id=$1 AND claim_id=$2", [row.id,claim]);
    });
  }

  private async lock<T>(scope: Scope | { tenant_id: string; branch_id: string }, work: (client: PoolClient) => Promise<T>): Promise<T> {
    const tenant = 'tenantId' in scope ? scope.tenantId : scope.tenant_id;
    const branch = 'branchId' in scope ? scope.branchId : scope.branch_id;
    const client = await this.repository.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL lock_timeout='5s'");
      await client.query("SET LOCAL statement_timeout='15s'");
      await client.query('SELECT 1 FROM branches WHERE tenant_id=$1 AND id=$2 FOR UPDATE', [tenant,branch]);
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
}

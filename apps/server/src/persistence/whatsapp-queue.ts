import { randomUUID } from 'node:crypto';
import type { Identity, PostgresRepository } from './database.ts';
import { WhatsAppDeliveryError, type Inbound } from '../integrations/whatsapp.ts';
import type { WhatsAppTransport } from '../integrations/contracts.ts';
import { Conversation } from '../modules/whatsapp/conversation.ts';
import { OrderingService } from '../platform/ordering.ts';
import { DemoPaymentProvider, DemoPosProvider } from '../integrations/contracts.ts';

// Persist first, acknowledge second. Domain work and reply creation commit together.
// Network ambiguity is parked for staff rather than blindly resending a message.
export class WhatsAppQueue {
  private running?: Promise<void>;
  private timer?: ReturnType<typeof setInterval>;
  constructor(readonly repository: PostgresRepository, readonly transport: WhatsAppTransport, readonly phoneId: string) {}

  async enqueue(identity: Identity, messages: Inbound[]) {
    await this.repository.transaction(identity, 'whatsapp.enqueue', async (_state, client) => {
      for (const message of messages) await client.query(`INSERT INTO whatsapp_jobs(tenant_id,branch_id,phone_id,message_id,sender,message_text)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(tenant_id,branch_id,phone_id,message_id) DO NOTHING`,
      [identity.tenantId, identity.branchId, this.phoneId, message.id, message.from, message.text]);
    });
  }

  async processOne(identity: Identity) {
    let jobId: string | undefined;
    try { return await this.repository.transaction(identity, 'whatsapp.process', async (state, client) => {
      // Branch lock is held. A later message cannot overtake an unfinished reply
      // for the same sender; other conversations remain eligible during backoff.
      const found = await client.query(`SELECT j.* FROM whatsapp_jobs j WHERE j.tenant_id=$1 AND j.branch_id=$2 AND j.phone_id=$3
        AND j.state='pending' AND j.available_at<=now() AND NOT EXISTS (
          SELECT 1 FROM whatsapp_jobs earlier WHERE earlier.tenant_id=j.tenant_id AND earlier.branch_id=j.branch_id
          AND earlier.phone_id=j.phone_id AND earlier.sender=j.sender AND earlier.id<j.id AND earlier.state<>'sent'
        ) ORDER BY j.id LIMIT 1 FOR UPDATE`, [identity.tenantId, identity.branchId, this.phoneId]);
      const job = found.rows[0];
      if (!job) return false;
      jobId = job.id;
      if (state.delivered.has(`${state.tenant.id}:${job.sender}:${job.message_id}`)) {
        await client.query("UPDATE whatsapp_jobs SET state='sent',completed_at=now() WHERE id=$1 AND tenant_id=$2 AND branch_id=$3", [job.id, identity.tenantId, identity.branchId]);
        return true;
      }
      const response = await new Conversation(new OrderingService(state, new DemoPaymentProvider(), new DemoPosProvider())).receive(job.sender, job.message_id, job.message_text);
      await client.query("UPDATE whatsapp_jobs SET response=$2,state='reply_pending',attempts=0,error_code=NULL WHERE id=$1 AND tenant_id=$3 AND branch_id=$4", [job.id, response, identity.tenantId, identity.branchId]);
      return true;
    }); } catch (error) {
      if (!jobId) throw error;
      await this.repository.pool.query(`UPDATE whatsapp_jobs SET attempts=attempts+1,error_code='processing_failed',
        state=CASE WHEN attempts>=4 THEN 'failed' ELSE 'pending' END,available_at=now()+interval '30 seconds'
        WHERE id=$1 AND state='pending' AND tenant_id=$2 AND branch_id=$3`, [jobId, identity.tenantId, identity.branchId]);
      return true;
    }
  }

  async sendOne(identity: Identity) {
    const claim = randomUUID();
    const job = await this.repository.transaction(identity, 'whatsapp.claim', async (_state, client) => {
      await client.query(`UPDATE whatsapp_jobs SET state='needs_attention',error_code='send_outcome_unknown',lease_until=NULL
        WHERE tenant_id=$1 AND branch_id=$2 AND phone_id=$3 AND state='sending' AND lease_until<now()`,
      [identity.tenantId, identity.branchId, this.phoneId]);
      const found = await client.query(`SELECT j.* FROM whatsapp_jobs j WHERE j.tenant_id=$1 AND j.branch_id=$2 AND j.phone_id=$3
        AND j.state='reply_pending' AND j.available_at<=now() AND NOT EXISTS (
          SELECT 1 FROM whatsapp_jobs earlier WHERE earlier.tenant_id=j.tenant_id AND earlier.branch_id=j.branch_id
          AND earlier.phone_id=j.phone_id AND earlier.sender=j.sender AND earlier.id<j.id AND earlier.state<>'sent'
        ) ORDER BY j.id LIMIT 1 FOR UPDATE`, [identity.tenantId, identity.branchId, this.phoneId]);
      const row = found.rows[0];
      if (!row) return undefined;
      await client.query("UPDATE whatsapp_jobs SET state='sending',claim_id=$2,lease_until=now()+interval '60 seconds',attempts=attempts+1 WHERE id=$1 AND tenant_id=$3 AND branch_id=$4", [row.id, claim, identity.tenantId, identity.branchId]);
      return row;
    });
    if (!job) return false;
    let receipt: void | { id: string };
    try { receipt = await this.transport.sendText(job.sender, job.response); }
    catch (error) {
      const known = error instanceof WhatsAppDeliveryError;
      const retry = known && error.retryable && job.attempts < 4;
      const state = retry ? 'reply_pending' : known ? 'failed' : 'needs_attention';
      const seconds = Math.min(300, 2 ** (job.attempts + 1));
      await this.repository.pool.query(`UPDATE whatsapp_jobs SET state=$3,error_code=$4,lease_until=NULL,available_at=now()+$5*interval '1 second'
        WHERE id=$1 AND claim_id=$2 AND state='sending' AND tenant_id=$6 AND branch_id=$7`, [job.id, claim, state, known ? 'provider_rejected' : 'send_outcome_unknown', seconds, identity.tenantId, identity.branchId]);
      return true;
    }
    await this.repository.transaction(identity, 'whatsapp.delivery', async (state, client) => {
      const updated = await client.query(`UPDATE whatsapp_jobs SET state='sent',completed_at=now(),lease_until=NULL,provider_message_id=$3
        WHERE id=$1 AND claim_id=$2 AND state='sending' AND tenant_id=$4 AND branch_id=$5 RETURNING id`, [job.id, claim, receipt?.id ?? null, identity.tenantId, identity.branchId]);
      if (updated.rowCount) state.delivered.add(`${state.tenant.id}:${job.sender}:${job.message_id}`);
    });
    return true;
  }

  // A single poll promise avoids overlapping timers locally; DB branch locks and
  // committed claims coordinate distinct processes. No process-local correctness.
  tick() {
    if (this.running) return this.running;
    this.running = this.drain().finally(() => { this.running = undefined; });
    return this.running;
  }
  private async drain() {
    const identity = await this.repository.channelIdentity(this.phoneId);
    if (!identity) return;
    const work = await this.repository.pool.query(`SELECT 1 FROM whatsapp_jobs WHERE tenant_id=$1 AND branch_id=$2 AND phone_id=$3
      AND ((state IN ('pending','reply_pending') AND available_at<=now()) OR (state='sending' AND lease_until<now())) LIMIT 1`,
    [identity.tenantId, identity.branchId, this.phoneId]);
    if (!work.rowCount) return;
    for (let count = 0; count < 20; count++) {
      const processed = await this.processOne(identity);
      const sent = await this.sendOne(identity);
      if (!processed && !sent) break;
    }
  }
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => { void this.tick().catch(() => { /* DB state preserves work; no PII in logs. */ }); }, 1000);
    this.timer.unref();
  }
  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    await this.running;
  }
}

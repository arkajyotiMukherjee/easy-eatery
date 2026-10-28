import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Pool, type PoolClient } from 'pg';
import { MemoryStore, type Order } from '../platform/domain.ts';
import { isDeepStrictEqual } from 'node:util';

export type Role = 'owner' | 'operator' | 'viewer';
export type Scope = { tenantId: string; branchId: string };
export type Identity = Scope & { actorId: string; role: Role; tokenId?: string; phoneId?: string };
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export class AccessError extends Error { constructor(readonly statusCode: 401 | 403 = 401) { super('Access denied'); } }

export function databasePool(url: string) {
  return new Pool({ connectionString: url, max: 8, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
}

export async function migrate(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('easy-eatery-migrations'))");
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const directory = new URL('../../../../migrations/', import.meta.url);
    for (const name of (await readdir(directory)).filter(f => /^\d+.*\.sql$/.test(f)).sort()) {
      const sql = await readFile(new URL(name, directory), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = await client.query('SELECT checksum FROM schema_migrations WHERE name = $1', [name]);
      if (existing.rows.length) {
        if (existing.rows[0].checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name, checksum) VALUES ($1, $2)', [name, checksum]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export class PostgresRepository {
  constructor(readonly pool: Pool) {}

  async authenticate(token: string): Promise<Identity | null> {
    if (token.length < 32 || token.length > 256) return null;
    const result = await this.pool.query(`SELECT t.id, t.tenant_id, t.branch_id, t.user_id, m.role
      FROM access_tokens t JOIN memberships m USING (tenant_id, branch_id, user_id)
      WHERE t.token_hash = $1 AND t.revoked_at IS NULL AND t.expires_at > now() AND m.active`, [tokenHash(token)]);
    const row = result.rows[0];
    return row ? { tenantId: row.tenant_id, branchId: row.branch_id, actorId: row.user_id, role: row.role, tokenId: row.id } : null;
  }

  async channelIdentity(phoneId: string): Promise<Identity | null> {
    const result = await this.pool.query("SELECT tenant_id, branch_id FROM channel_accounts WHERE provider = 'whatsapp' AND external_account_id = $1", [phoneId]);
    const row = result.rows[0];
    return row ? { tenantId: row.tenant_id, branchId: row.branch_id, actorId: 'whatsapp', role: 'operator', phoneId } : null;
  }

  // A branch row lock serializes this small POC's unit of work across app processes.
  // Domain Maps are transaction-local working sets, never the durable source of truth.
  async transaction<T>(identity: Identity, action: string, work: (state: MemoryStore) => Promise<T> | T): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query("SET LOCAL statement_timeout = '15s'");
      const scope = [identity.tenantId, identity.branchId];
      const branch = await client.query('SELECT * FROM branches WHERE tenant_id = $1 AND id = $2 FOR UPDATE', scope);
      if (!branch.rows.length) throw new AccessError();
      await this.authorize(client, identity, action);
      const state = await this.load(client, identity, branch.rows[0]);
      const before = new Map([...state.orders].map(([id, order]) => [id, structuredClone(order)]));
      const result = await work(state);
      if (state.tenant.id !== identity.tenantId || state.tenant.branchId !== identity.branchId) throw new AccessError(403);
      if (!action.endsWith('.read')) {
        await this.save(client, state, before);
        await client.query('INSERT INTO audit_events(tenant_id, branch_id, actor_id, action) VALUES($1,$2,$3,$4)', [...scope, identity.actorId, action]);
      }
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  private async authorize(client: PoolClient, identity: Identity, action: string) {
    if (identity.tokenId) {
      const result = await client.query(`SELECT m.role FROM access_tokens t JOIN memberships m USING(tenant_id,branch_id,user_id)
        WHERE t.id=$1 AND t.tenant_id=$2 AND t.branch_id=$3 AND t.user_id=$4
        AND t.revoked_at IS NULL AND t.expires_at > now() AND m.active`, [identity.tokenId, identity.tenantId, identity.branchId, identity.actorId]);
      if (!result.rows.length) throw new AccessError();
      if (result.rows[0].role === 'viewer' && !action.endsWith('.read')) throw new AccessError(403);
      if (action === 'catalog.replace' && result.rows[0].role !== 'owner') throw new AccessError(403);
      return;
    }
    if (identity.phoneId && action.startsWith('whatsapp.')) {
      const result = await client.query("SELECT 1 FROM channel_accounts WHERE provider='whatsapp' AND external_account_id=$1 AND tenant_id=$2 AND branch_id=$3", [identity.phoneId, identity.tenantId, identity.branchId]);
      if (result.rows.length) return;
    }
    throw new AccessError();
  }

  private async load(client: PoolClient, identity: Scope, branch: any) {
    const scope = [identity.tenantId, identity.branchId];
    const state = new MemoryStore();
    state.tenant = { id: identity.tenantId, branchId: identity.branchId, name: branch.name, timezone: branch.timezone, payAtPickup: branch.pay_at_pickup, posProvider: branch.pos_provider, modules: branch.modules };
    state.catalog = { version: branch.catalog_version, source: branch.catalog_source, updatedAt: branch.catalog_updated_at.toISOString() };
    state.availability = branch.service_availability;
    const products = await client.query('SELECT * FROM products WHERE tenant_id=$1 AND branch_id=$2 ORDER BY id', scope);
    state.products = products.rows.map(r => ({ id: r.id, name: r.name, nameEn: r.name_en, price: r.price, available: r.available, mappings: r.provider_mappings, modifiers: r.modifiers }));
    const orders = await client.query('SELECT * FROM orders WHERE tenant_id=$1 AND branch_id=$2 ORDER BY created_at, id', scope);
    const lines = await client.query('SELECT * FROM order_lines WHERE tenant_id=$1 AND branch_id=$2 ORDER BY order_id, line_number', scope);
    for (const row of orders.rows) {
      state.orders.set(row.id, {
        id: row.id, tenantId: identity.tenantId, branchId: identity.branchId, customerId: row.customer_id,
        paymentMethod: row.payment_method, paymentState: row.payment_state, fulfillment: row.fulfillment, source: row.source, currency: row.currency, total: row.total, status: row.status, posProvider: row.pos_provider,
        createdAt: row.created_at.toISOString(), paymentReference: row.payment_reference ?? undefined, posReference: row.pos_reference ?? undefined, catalogVersion: row.catalog_version ?? undefined,
        lines: lines.rows.filter(l => l.order_id === row.id).map(l => ({ productId: l.product_id, name: l.name, nameEn: l.name_en, unitPrice: l.unit_price, quantity: l.quantity, ...l.selection })),
      });
    }
    const sessions = await client.query('SELECT * FROM conversations WHERE tenant_id=$1 AND branch_id=$2', scope);
    for (const row of sessions.rows) state.sessions.set(`${identity.tenantId}:${row.customer_id}`, { cart: new Map(row.cart), locale: row.locale, orderId: row.order_id ?? undefined, expiresAt: row.expires_at.getTime(), quote: row.quote ?? undefined });
    const inbox = await client.query('SELECT event_key, response FROM inbox WHERE tenant_id=$1 AND branch_id=$2', scope);
    for (const row of inbox.rows) state.inbox.set(row.event_key, row.response);
    const deliveries = await client.query('SELECT event_key FROM whatsapp_deliveries WHERE tenant_id=$1 AND branch_id=$2', scope);
    for (const row of deliveries.rows) state.delivered.add(row.event_key);
    return state;
  }

  private async save(client: PoolClient, state: MemoryStore, before: Map<string, Order>) {
    const scope = [state.tenant.id, state.tenant.branchId];
    await client.query('UPDATE branches SET catalog_version=$3,catalog_source=$4,catalog_updated_at=$5,service_availability=$6 WHERE tenant_id=$1 AND id=$2', [...scope, state.catalog.version, state.catalog.source, state.catalog.updatedAt, JSON.stringify(state.availability)]);
    for (const p of state.products) {
      await client.query(`INSERT INTO products(tenant_id,branch_id,id,name,name_en,price,available,provider_mappings,modifiers) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT(tenant_id,branch_id,id) DO UPDATE SET name=EXCLUDED.name,name_en=EXCLUDED.name_en,price=EXCLUDED.price,available=EXCLUDED.available,provider_mappings=EXCLUDED.provider_mappings,modifiers=EXCLUDED.modifiers`, [...scope, p.id, p.name, p.nameEn, p.price, p.available, JSON.stringify(p.mappings ?? {}), JSON.stringify(p.modifiers ?? [])]);
    }
    for (const o of state.orders.values()) {
      if (o.tenantId !== state.tenant.id || o.branchId !== state.tenant.branchId) throw new AccessError(403);
      if (o.total !== o.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)) throw new Error('Order total does not match its lines');
      await client.query(`INSERT INTO orders(tenant_id,branch_id,id,customer_id,source,currency,total,status,pos_provider,payment_reference,pos_reference,created_at,catalog_version,payment_method,payment_state,fulfillment)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT(tenant_id,branch_id,id) DO UPDATE SET status=EXCLUDED.status,payment_state=EXCLUDED.payment_state,payment_reference=EXCLUDED.payment_reference,pos_reference=EXCLUDED.pos_reference`,
      [...scope, o.id, o.customerId, o.source, o.currency, o.total, o.status, o.posProvider, o.paymentReference, o.posReference, o.createdAt, o.catalogVersion, o.paymentMethod ?? 'simulation', o.paymentState ?? 'due', o.fulfillment ?? 'simulation']);
      if (!before.has(o.id)) {
        for (const [index, line] of o.lines.entries()) await client.query(`INSERT INTO order_lines(tenant_id,branch_id,order_id,line_number,product_id,name,name_en,unit_price,quantity,selection)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [...scope, o.id, index, line.productId, line.name, line.nameEn, line.unitPrice, line.quantity, JSON.stringify({ ...(line.providerProductId ? { providerProductId: line.providerProductId } : {}), ...(line.modifiers ? { modifiers: line.modifiers } : {}) })]);
      } else {
        const original = before.get(o.id)!;
        if (o.paymentMethod !== original.paymentMethod || o.fulfillment !== original.fulfillment || o.total !== original.total || o.customerId !== original.customerId || o.posProvider !== original.posProvider || o.catalogVersion !== original.catalogVersion || !isDeepStrictEqual(o.lines, original.lines)) throw new Error('Confirmed order snapshot is immutable');
      }
      if (o.paymentReference) await client.query(`INSERT INTO payment_attempts(tenant_id,branch_id,reference,order_id,provider,amount,currency,status)
        VALUES($1,$2,$3,$4,'simulation',$5,$6,$7) ON CONFLICT(tenant_id,branch_id,reference) DO UPDATE SET status=EXCLUDED.status`,
      [...scope, o.paymentReference, o.id, o.total, o.currency, o.paymentState === 'simulated_paid' ? 'simulated_paid' : 'pending']);
      if (before.get(o.id)?.status !== o.status || before.get(o.id)?.paymentState !== o.paymentState) await client.query(`INSERT INTO outbox(tenant_id,branch_id,event_key,event_type,order_id,payload)
        VALUES($1,$2,$3,'order.state_changed',$4,$5) ON CONFLICT DO NOTHING`, [...scope, `${o.id}:${o.status}:${o.paymentState}`, o.id, JSON.stringify({ orderId: o.id, status: o.status, paymentState: o.paymentState, fulfillment: o.fulfillment, posProvider: o.posProvider })]);
    }
    for (const [key, session] of state.sessions) {
      const customerId = key.slice(state.tenant.id.length + 1);
      await client.query(`INSERT INTO conversations(tenant_id,branch_id,customer_id,locale,cart,order_id,expires_at,quote) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT(tenant_id,branch_id,customer_id) DO UPDATE SET locale=EXCLUDED.locale,cart=EXCLUDED.cart,order_id=EXCLUDED.order_id,expires_at=EXCLUDED.expires_at,quote=EXCLUDED.quote`,
      [...scope, customerId, session.locale, JSON.stringify([...session.cart]), session.orderId ?? null, new Date(session.expiresAt), session.quote ? JSON.stringify(session.quote) : null]);
    }
    for (const [key, response] of state.inbox) await client.query('INSERT INTO inbox(tenant_id,branch_id,event_key,response) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [...scope, key, response]);
    for (const key of state.delivered) await client.query('INSERT INTO whatsapp_deliveries(tenant_id,branch_id,event_key) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [...scope, key]);
  }
}

export async function seedBranch(pool: Pool, scope: Scope, name: string, posProvider: 'toteat' | 'fudo', phoneId?: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO tenants(id,name) VALUES($1,$2) ON CONFLICT DO NOTHING', [scope.tenantId, name]);
    await client.query('INSERT INTO branches(tenant_id,id,name,pos_provider) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [scope.tenantId, scope.branchId, name, posProvider]);
    // Repeatable seed inserts missing rows only; it never overwrites existing menu/credentials.
    for (const p of new MemoryStore().products) await client.query('INSERT INTO products(tenant_id,branch_id,id,name,name_en,price,available) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING', [scope.tenantId, scope.branchId, p.id, p.name, p.nameEn, p.price, p.available]);
    if (phoneId) {
      await client.query("INSERT INTO channel_accounts(provider,external_account_id,tenant_id,branch_id) VALUES('whatsapp',$1,$2,$3) ON CONFLICT DO NOTHING", [phoneId, scope.tenantId, scope.branchId]);
      const mapped = await client.query("SELECT tenant_id,branch_id FROM channel_accounts WHERE provider='whatsapp' AND external_account_id=$1", [phoneId]);
      if (mapped.rows[0].tenant_id !== scope.tenantId || mapped.rows[0].branch_id !== scope.branchId) throw new Error('Phone ID already belongs to another branch');
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function issueStaffToken(pool: Pool, scope: Scope, displayName: string, role: Role, validDays = 7) {
  if (!Number.isInteger(validDays) || validDays < 1 || validDays > 90) throw new Error('Token lifetime must be 1–90 days');
  const userId = randomUUID(), tokenId = randomUUID(), token = randomBytes(32).toString('base64url');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO staff_users(id,display_name) VALUES($1,$2)', [userId, displayName]);
    await client.query('INSERT INTO memberships(tenant_id,branch_id,user_id,role) VALUES($1,$2,$3,$4)', [scope.tenantId, scope.branchId, userId, role]);
    await client.query("INSERT INTO access_tokens(id,tenant_id,branch_id,user_id,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,now()+($6 * interval '1 day'))", [tokenId, scope.tenantId, scope.branchId, userId, tokenHash(token), validDays]);
    await client.query('COMMIT');
    return { userId, tokenId, token, role, ...scope, validDays };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

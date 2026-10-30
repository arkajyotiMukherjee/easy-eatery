import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { createApp } from '../apps/server/src/app.ts';
import { issueStaffToken, migrate, PostgresRepository, seedBranch } from '../apps/server/src/persistence/database.ts';
import { WhatsAppQueue } from '../apps/server/src/persistence/whatsapp-queue.ts';
import { WhatsAppRecovery } from '../apps/server/src/persistence/whatsapp-recovery.ts';
import { WhatsAppDeliveryError } from '../apps/server/src/integrations/whatsapp.ts';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Set disposable TEST_DATABASE_URL to run recovery integration tests.');

test('staff recovery preserves scope, conversation ordering and uncertain-send boundaries', async t => {
  const admin = new Pool({ connectionString: url });
  const schema = `ee_recovery_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: url, max: 8, options: `-c search_path=${schema}` });
  const repository = new PostgresRepository(pool);
  const app = createApp({ repository }).app;
  const otherApp = createApp({ repository: new PostgresRepository(pool) }).app;
  t.after(async () => {
    await app.close(); await otherApp.close(); await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end();
  });
  await migrate(pool); await migrate(pool);
  const scope = { tenantId: 'recovery', branchId: 'main' };
  const otherScope = { tenantId: 'other', branchId: 'main' };
  await seedBranch(pool, scope, 'Recovery demo', 'toteat', '701');
  await seedBranch(pool, otherScope, 'Other demo', 'fudo', '702');
  const owner = await issueStaffToken(pool, scope, 'Owner', 'owner');
  const operator = await issueStaffToken(pool, scope, 'Operator', 'operator');
  const viewer = await issueStaffToken(pool, scope, 'Viewer', 'viewer');
  const outsider = await issueStaffToken(pool, otherScope, 'Other owner', 'owner');
  const revoked = await issueStaffToken(pool, scope, 'Revoked', 'operator');
  const revokedIdentity = (await repository.authenticate(revoked.token))!;
  await pool.query('UPDATE access_tokens SET revoked_at=now() WHERE id=$1', [revoked.tokenId]);
  const identity = (await repository.channelIdentity('701'))!;
  const sends: string[] = [];
  let reject = true;
  const transport = { sendText: async (to: string, _text: string) => {
    sends.push(to);
    if (to === 'uncertain-contact' && sends.filter(s => s === to).length === 1) throw new Error('Synthetic timeout');
    if (to === 'rejected-contact' && reject) throw new WhatsAppDeliveryError(false);
    return { id: `synthetic-${sends.length}` };
  } };
  const queue = new WhatsAppQueue(repository, transport, '701');
  const headers = (token: string) => ({ authorization: `Bearer ${token}`, 'accept-language': 'en' });
  const request = (id: string, action: 'retry' | 'resolve', token = owner.token, target = app, expectedVersion = 0) => target.inject({
    method: 'POST', url: `/api/whatsapp/delivery/jobs/${id}/${action}`, headers: headers(token),
    payload: action === 'retry' ? { expectedState: 'failed', expectedVersion } : { expectedState: 'needs_attention', expectedVersion, confirmation: 'reviewed_without_resend' },
  });
  await queue.enqueue(identity, [
    { id: 'ambiguous', from: 'uncertain-contact', text: 'hello', timestamp: Math.floor(Date.now() / 1000) },
    { id: 'later', from: 'uncertain-contact', text: '1', timestamp: Math.floor(Date.now() / 1000) },
    { id: 'rejected', from: 'rejected-contact', text: 'hello', timestamp: Math.floor(Date.now() / 1000) },
    { id: 'independent', from: 'independent-contact', text: 'hello', timestamp: Math.floor(Date.now() / 1000) },
  ]);
  await queue.tick();
  const jobs = (await pool.query('SELECT id::text,message_id,state FROM whatsapp_jobs WHERE tenant_id=$1', [scope.tenantId])).rows;
  const uncertain = jobs.find(j => j.message_id === 'ambiguous').id;
  const failed = jobs.find(j => j.message_id === 'rejected').id;

  await t.test('lists redacted branch-scoped exceptions without message/contact/provider data', async () => {
    const response = await app.inject({ url: '/api/whatsapp/delivery/jobs', headers: headers(viewer.token) });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().jobs.length, 2);
    assert.deepEqual(Object.keys(response.json().jobs[0]).sort(), ['id','state','version','attempts','error_code','created_at','available_at','completed_at'].sort());
    assert.equal(response.body.includes('contact'), false);
    const other = await app.inject({ url: '/api/whatsapp/delivery/jobs', headers: headers(outsider.token) });
    assert.deepEqual(other.json().jobs, []);
    assert.equal(jobs.find(j => j.message_id === 'later').state, 'pending');
    assert.equal(jobs.find(j => j.message_id === 'independent').state, 'sent');
  });

  await t.test('rejects unsafe replay, viewers, cross-tenant jobs, revoked identities and missing confirmation', async () => {
    assert.equal((await request(uncertain, 'retry')).statusCode, 409);
    assert.equal((await request(uncertain, 'resolve', viewer.token)).statusCode, 403);
    assert.equal((await request(uncertain, 'resolve', outsider.token)).statusCode, 409);
    assert.equal((await request(uncertain, 'resolve', revoked.token)).statusCode, 401);
    await assert.rejects(new WhatsAppRecovery(repository).resolve(revokedIdentity, uncertain, 0), { statusCode: 401 });
    assert.equal((await app.inject({ method: 'POST', url: `/api/whatsapp/delivery/jobs/${uncertain}/resolve`, headers: headers(owner.token), payload: { expectedState: 'needs_attention' } })).statusCode, 400);
    assert.equal((await request('999999999999999999', 'resolve')).statusCode, 409);
    assert.equal(sends.filter(s => s === 'uncertain-contact').length, 1);
  });

  await t.test('concurrent manual review resolves once, never resends or claims delivery, and releases later work', async () => {
    const results = await Promise.all([request(uncertain, 'resolve'), request(uncertain, 'resolve', operator.token, otherApp)]);
    assert.deepEqual(results.map(r => r.statusCode).sort(), [200,409]);
    const response = results.find(r => r.statusCode === 200)!.json();
    assert.deepEqual(response, { id: uncertain, state: 'resolved', version: 1, deliveryConfirmed: false, resent: false });
    assert.equal(sends.filter(s => s === 'uncertain-contact').length, 1);
    assert.equal((await pool.query('SELECT count(*) FROM audit_events WHERE action=$1', [`whatsapp.recovery.resolve:${uncertain}`])).rows[0].count, '1');
    assert.equal((await pool.query("SELECT count(*) FROM whatsapp_deliveries WHERE event_key LIKE '%:ambiguous'")).rows[0].count, '0');
    await new WhatsAppQueue(repository, transport, '701').tick();
    assert.equal((await pool.query("SELECT state FROM whatsapp_jobs WHERE message_id='later'")).rows[0].state, 'sent');
    assert.deepEqual((await pool.query("SELECT cart FROM conversations WHERE tenant_id='recovery' AND customer_id='uncertain-contact'")).rows[0].cart, [['1',1]]);
    await queue.enqueue(identity, [{ id: 'ambiguous', from: 'uncertain-contact', text: 'hello', timestamp: Math.floor(Date.now() / 1000) }]);
    await queue.tick();
    assert.equal(sends.filter(s => s === 'uncertain-contact').length, 2); // Original ambiguous attempt + later message only.
    assert.equal((await pool.query('SELECT count(*) FROM orders')).rows[0].count, '0');
    assert.equal((await pool.query('SELECT count(*) FROM payment_attempts')).rows[0].count, '0');
  });

  await t.test('known rejection retry is scoped, audited, single-winner and reuses the committed reply', async () => {
    assert.equal((await request(failed, 'resolve')).statusCode, 409);
    const results = await Promise.all([request(failed, 'retry', operator.token), request(failed, 'retry', owner.token, otherApp)]);
    assert.deepEqual(results.map(r => r.statusCode).sort(), [200,409]);
    assert.equal(results.find(r => r.statusCode === 200)!.json().state, 'reply_pending');
    // Another explicit rejection returns to 'failed'. A duplicated old review
    // must not reopen it or reset its retry budget (ABA state transition).
    await queue.tick();
    assert.equal((await request(failed, 'retry')).statusCode, 409);
    assert.equal((await pool.query('SELECT state,recovery_version FROM whatsapp_jobs WHERE id=$1', [failed])).rows[0].recovery_version, 1);
    const reviewed = await request(failed, 'retry', owner.token, app, 1);
    assert.equal(reviewed.statusCode, 200);
    assert.equal(reviewed.json().version, 2);
    reject = false;
    await queue.tick();
    assert.equal(sends.filter(s => s === 'rejected-contact').length, 3);
    assert.equal((await pool.query('SELECT state FROM whatsapp_jobs WHERE id=$1', [failed])).rows[0].state, 'sent');
    assert.equal((await request(failed, 'retry')).statusCode, 409);
    assert.equal((await pool.query('SELECT count(*) FROM audit_events WHERE action=$1', [`whatsapp.recovery.retry:${failed}`])).rows[0].count, '2');
  });

  await t.test('processing failure retries domain work instead of sending an absent reply', async () => {
    await queue.enqueue(identity, [{ id: 'processing', from: 'processing-contact', text: 'hello', timestamp: Math.floor(Date.now() / 1000) }]);
    const row = (await pool.query("UPDATE whatsapp_jobs SET state='failed',attempts=5,error_code='processing_failed' WHERE message_id='processing' RETURNING id::text")).rows[0];
    const response = await request(row.id, 'retry');
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().state, 'pending');
    await queue.tick();
    assert.equal(sends.filter(s => s === 'processing-contact').length, 1);
    assert.equal((await pool.query('SELECT state FROM whatsapp_jobs WHERE id=$1', [row.id])).rows[0].state, 'sent');
  });
});

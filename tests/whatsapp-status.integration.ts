import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { createApp } from '../apps/server/src/app.ts';
import { issueStaffToken, migrate, PostgresRepository, seedBranch } from '../apps/server/src/persistence/database.ts';
import { WhatsAppQueue } from '../apps/server/src/persistence/whatsapp-queue.ts';
import { WhatsAppStatuses } from '../apps/server/src/persistence/whatsapp-status.ts';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Set disposable TEST_DATABASE_URL to run status integration tests.');

test('signed status evidence is scoped, replay-safe and distinct from queue/payment state', async t => {
  const admin = new Pool({ connectionString: url });
  const schema = `ee_status_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: url, max: 8, options: `-c search_path=${schema}` });
  const repository = new PostgresRepository(pool);
  const scope = { tenantId: 'status-restaurant', branchId: 'main' };
  const otherScope = { tenantId: 'other-restaurant', branchId: 'main' };
  const secret = 'fixture-app-secret';
  const { app, queue } = createApp({ repository, phoneId: '701', appSecret: secret,
    transport: { sendText: async to => {
      if (to === 'uncertain-contact') throw new Error('Synthetic timeout');
      return { id: 'provider-known' };
    } },
  });
  t.after(async () => {
    await app.close(); await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end();
  });
  await migrate(pool); await migrate(pool);
  await seedBranch(pool, scope, 'Status demo', 'toteat', '701');
  await seedBranch(pool, otherScope, 'Other demo', 'fudo', '702');
  const owner = await issueStaffToken(pool, scope, 'Owner', 'owner');
  const outsider = await issueStaffToken(pool, otherScope, 'Other owner', 'owner');
  const identity = (await repository.channelIdentity('701'))!;
  const statuses = new WhatsAppStatuses(repository, '701');
  const headers = (token: string) => ({ authorization: `Bearer ${token}` });
  const webhook = async (state: string, timestamp: string, options: { phone?: string; signature?: string; id?: string } = {}) => {
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
      metadata: { phone_number_id: options.phone ?? '701' }, statuses: [{ id: options.id ?? 'provider-known', status: state,
        timestamp, recipient_id: 'private-contact', errors: [{ code: 131026, title: 'private-description' }] }],
    } }] }] });
    return app.inject({ method: 'POST', url: '/webhooks/whatsapp', headers: { 'content-type': 'application/json',
      'x-hub-signature-256': options.signature ?? 'sha256=' + createHmac('sha256', secret).update(body).digest('hex') }, payload: body });
  };

  await t.test('signature/account guards reject forgery; status-only webhook never creates conversations', async () => {
    assert.equal((await webhook('delivered', '1793200000', { signature: 'sha256=' + '0'.repeat(64) })).statusCode, 401);
    assert.equal((await webhook('delivered', '1793200000', { phone: '702' })).statusCode, 200);
    assert.equal((await pool.query('SELECT count(*) FROM whatsapp_status_events')).rows[0].count, '0');
    assert.equal((await webhook('read', '1793200030')).statusCode, 200);
    assert.equal((await webhook('read', '1793200030')).statusCode, 200);
    assert.equal((await pool.query('SELECT count(*) FROM whatsapp_status_events')).rows[0].count, '1');
    assert.equal((await pool.query('SELECT count(*) FROM conversations')).rows[0].count, '0');
    assert.equal((await pool.query('SELECT count(*) FROM whatsapp_jobs')).rows[0].count, '0');
  });

  await t.test('pre-receipt status correlates after send commit; late sent/failed does not erase read evidence', async () => {
    await queue!.enqueue(identity, [{ id: 'inbound', from: 'fixture-contact', text: 'hello', timestamp: Math.floor(Date.now() / 1000) }]);
    await queue!.tick();
    await webhook('sent', '1793200010');
    await webhook('failed', '1793200040');
    const response = await app.inject({ url: '/api/whatsapp/delivery/receipts', headers: headers(owner.token) });
    assert.equal(response.statusCode, 200);
    const receipt = response.json().receipts[0];
    assert.equal(receipt.provider_accepted, true);
    assert.equal(receipt.provider_sent, true);
    assert.equal(receipt.device_delivered, true);
    assert.equal(receipt.device_read, true);
    assert.equal(receipt.provider_failed, true);
    assert.equal(receipt.delivery_status, 'read');
    assert.equal(receipt.queue_state, 'sent');
    assert.equal(response.body.includes('private'), false);
    assert.equal(response.body.includes('provider-known'), false);
    const otherIdentity = (await repository.channelIdentity('702'))!;
    const otherQueue = new WhatsAppQueue(repository, { sendText: async () => ({ id: 'provider-known' }) }, '702');
    await otherQueue.enqueue(otherIdentity, [{ id: 'other-inbound', from: 'other-fixture', text: 'hello', timestamp: Math.floor(Date.now() / 1000) }]);
    await otherQueue.tick();
    const other = await app.inject({ url: '/api/whatsapp/delivery/receipts', headers: headers(outsider.token) });
    assert.equal(other.json().receipts.length, 1);
    assert.equal(other.json().receipts[0].delivery_status, 'unknown');
    assert.equal(other.json().receipts[0].device_read, false);
    assert.equal((await pool.query('SELECT count(*) FROM payment_attempts')).rows[0].count, '0');
  });

  await t.test('unmatched status never resolves or resends an uncertain job, and channel scope is rechecked', async () => {
    await queue!.enqueue(identity, [{ id: 'uncertain', from: 'uncertain-contact', text: 'hello', timestamp: Math.floor(Date.now() / 1000) }]);
    await queue!.tick();
    await webhook('delivered', '1793200050', { id: 'provider-unknown' });
    await queue!.tick();
    assert.equal((await pool.query("SELECT state FROM whatsapp_jobs WHERE message_id='uncertain'")).rows[0].state, 'needs_attention');
    assert.equal((await pool.query("SELECT attempts FROM whatsapp_jobs WHERE message_id='uncertain'")).rows[0].attempts, 1);
    const otherIdentity = (await repository.channelIdentity('702'))!;
    await assert.rejects(statuses.record(otherIdentity, [{ id: 'provider-known', status: 'delivered', timestamp: 1793200050 }]), { statusCode: 403 });
    await pool.query("DELETE FROM channel_accounts WHERE external_account_id='701'");
    assert.equal((await webhook('delivered', '1793200060')).statusCode, 403);
  });
});

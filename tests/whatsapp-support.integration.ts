import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { migrate, seedBranch, issueStaffToken, PostgresRepository } from '../apps/server/src/persistence/database.ts';
import { SandboxPayments } from '../apps/server/src/persistence/sandbox-payments.ts';
import { WebpaySandbox } from '../apps/server/src/integrations/webpay.ts';
import { WhatsAppRecovery } from '../apps/server/src/persistence/whatsapp-recovery.ts';
import { WhatsAppQueue } from '../apps/server/src/persistence/whatsapp-queue.ts';
import { WhatsAppNotifications, WhatsAppSupportReview, handoffReason } from '../apps/server/src/persistence/whatsapp-support.ts';
import { WhatsAppDeliveryError } from '../apps/server/src/integrations/whatsapp.ts';
import { OrderingService } from '../apps/server/src/platform/ordering.ts';
import { DemoPaymentProvider, DemoPosProvider } from '../apps/server/src/integrations/contracts.ts';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Set disposable TEST_DATABASE_URL to run support integration tests.');

test('transactional pickup notifications respect verified windows, domain state and human review', async t => {
  const admin = new Pool({ connectionString: url });
  const schema = `ee_support_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: url, max: 8, options: `-c search_path=${schema}` });
  t.after(async () => { await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); });
  await migrate(pool); await migrate(pool);
  const scope = { tenantId: 'support', branchId: 'main' };
  const other = { tenantId: 'other', branchId: 'main' };
  await seedBranch(pool, scope, 'Support demo', 'toteat', '901');
  await seedBranch(pool, other, 'Other demo', 'fudo', '902');
  await pool.query('UPDATE branches SET pay_at_pickup=true');
  const repository = new PostgresRepository(pool);
  const channel = (await repository.channelIdentity('901'))!;
  const outsiderChannel = (await repository.channelIdentity('902'))!;
  const owner = await issueStaffToken(pool, scope, 'Owner', 'owner');
  const viewer = await issueStaffToken(pool, scope, 'Viewer', 'viewer');
  const outsider = await issueStaffToken(pool, other, 'Other', 'owner');
  const staff = (await repository.authenticate(owner.token))!;
  const readOnly = (await repository.authenticate(viewer.token))!;
  const otherStaff = (await repository.authenticate(outsider.token))!;
  const sends: { to: string; text: string }[] = [];
  let mode: 'normal' | 'reject' | 'unknown' = 'normal';
  const transport = { sendText: async (to: string, text: string) => {
    sends.push({ to, text });
    if (mode === 'reject') throw new WhatsAppDeliveryError(true);
    if (mode === 'unknown') throw new Error('Synthetic ambiguous timeout: never persist this private detail');
    return { id: `support-provider-${sends.length}` };
  } };
  const queue = new WhatsAppQueue(repository, transport, '901');
  const notifications = new WhatsAppNotifications(repository, transport, '901');
  const review = new WhatsAppSupportReview(repository);
  let sequence = 0;
  const fresh = () => Math.floor(Date.now() / 1000);
  const inbound = async (sender: string, text: string, timestamp?: number, id = `support-inbound-${++sequence}`) => {
    await queue.enqueue(channel, [{ id, from: sender, text, ...(timestamp === undefined ? {} : { timestamp }) }]);
    await queue.tick();
    return id;
  };
  const order = async (sender: string, timestamp?: number, locale: 'es' | 'en' = 'es') => {
    if (locale === 'en') await inbound(sender, 'English', fresh());
    await inbound(sender, '1', fresh());
    await inbound(sender, 'confirmar', fresh());
    await pool.query('UPDATE whatsapp_jobs SET provider_timestamp=to_timestamp($2) WHERE sender=$1', [sender, timestamp ?? null]);
    return (await pool.query('SELECT id FROM orders WHERE tenant_id=$1 AND branch_id=$2 AND customer_id=$3', [scope.tenantId, scope.branchId, sender])).rows[0].id as string;
  };
  const action = async (id: string, name: 'accept' | 'ready' | 'pay' | 'collected') => repository.transaction(staff, `support.test.${name}`, async state => {
    const ordering = new OrderingService(state, new DemoPaymentProvider(), new DemoPosProvider());
    if (name === 'accept') return ordering.acceptPickup(id);
    if (name === 'pay') return ordering.recordStorePayment(id);
    return ordering.transition(id, name);
  });
  const rows = async (id: string) => (await pool.query('SELECT * FROM whatsapp_notifications WHERE order_id=$1 ORDER BY id', [id])).rows;

  await t.test('Spanish and English verified state sends once, without sensitive financial data or simulation claims', async () => {
    for (const locale of ['es','en'] as const) {
      const sender = `customer-${locale}`;
      const id = await order(sender, fresh(), locale);
      const before = sends.length;
      await action(id, 'accept'); await queue.tick();
      await action(id, 'ready'); await queue.tick();
      await action(id, 'pay'); await queue.tick();
      await queue.tick();
      await new WhatsAppQueue(new PostgresRepository(pool), transport, '901').tick();
      const delivered = sends.slice(before);
      assert.equal(delivered.length, 3);
      assert.ok(delivered.every(s => s.to === sender));
      assert.match(delivered[0].text, locale === 'en' ? /restaurant accepted/ : /local aceptó/);
      assert.match(delivered[1].text, locale === 'en' ? /ready for pickup/ : /listo para retirar/);
      assert.match(delivered[2].text, locale === 'en' ? /staff recorded payment received at pickup/ : /personal registró el pago/);
      assert.ok(delivered.every(s => !/CLP|4500|4.500|token|card|tarjeta|settled|settlement|POS/.test(s.text)));
      assert.deepEqual((await rows(id)).map(r => r.state), ['sent','sent','sent']);
      await action(id, 'collected'); await queue.tick();
      assert.equal(sends.length, before + 3);
    }
  });

  await t.test('restored reply jobs with missing or expired windows never send and require explicit staff review', async () => {
    for (const [sender, timestamp] of [['reply-missing', undefined], ['reply-old', fresh()-86401], ['reply-future', fresh()+86400]] as const) {
      const before = sends.length;
      const messageId = await inbound(sender, 'hello', timestamp);
      const row = (await pool.query('SELECT state,error_code,attempts FROM whatsapp_jobs WHERE message_id=$1', [messageId])).rows[0];
      assert.equal(row.state, 'needs_attention');
      assert.equal(row.error_code, 'customer_window_closed');
      assert.equal(row.attempts, 0);
      await queue.enqueue(channel, [{ id: messageId, from: sender, text: 'hello', timestamp: fresh() }]);
      await queue.tick();
      assert.equal(sends.length, before);
    }
  });

  await t.test('missing, expired, future and replayed old timestamps route to staff, including expiry after staging', async () => {
    for (const [sender, timestamp] of [['missing',undefined],['expired',fresh()-86401],['future',fresh()+86400]] as const) {
      const id = await order(sender, timestamp);
      const before = sends.length;
      await action(id, 'accept'); await queue.tick();
      assert.equal(sends.length, before);
      assert.equal((await rows(id))[0].state, 'staff_required');
    }
    const sender = 'old-replay';
    const message = await inbound(sender, '1', fresh()-86401, 'old-timestamp');
    await queue.enqueue(channel, [{ id: message, from: sender, text: '1', timestamp: fresh() }]);
    const parked = (await pool.query('SELECT id::text,recovery_version FROM whatsapp_jobs WHERE message_id=$1', [message])).rows[0];
    await new WhatsAppRecovery(repository).resolve(staff, parked.id, parked.recovery_version);
    await inbound(sender, 'confirmar', fresh()-86401);
    const id = (await pool.query('SELECT id FROM orders WHERE customer_id=$1', [sender])).rows[0].id;
    const original = await pool.query('SELECT provider_timestamp FROM whatsapp_jobs WHERE message_id=$1', [message]);
    assert.ok(original.rows[0].provider_timestamp.getTime() < Date.now()-86400000);
    const before = sends.length;
    await action(id, 'accept'); await queue.tick();
    assert.equal(sends.length, before);
    assert.equal((await rows(id))[0].state, 'staff_required');
    const late = await order('late-ready', fresh());
    await action(late, 'accept'); await queue.tick();
    await action(late, 'ready'); await notifications.stage(channel);
    await pool.query("UPDATE whatsapp_jobs SET provider_timestamp=now()-interval '25 hours' WHERE sender='late-ready'");
    const lateBefore = sends.length;
    await notifications.sendOne(channel);
    assert.equal(sends.length, lateBefore);
    assert.equal((await rows(late)).find(r => r.kind === 'ready').state, 'staff_required');
  });

  await t.test('late superseded readiness and foreign account workers cannot send or duplicate a notification', async () => {
    const id = await order('superseded', fresh());
    await action(id, 'accept'); await queue.tick();
    await action(id, 'ready'); await notifications.stage(channel);
    await action(id, 'pay'); await action(id, 'collected');
    const before = sends.length;
    await notifications.sendOne(channel);
    assert.equal(sends.length, before);
    assert.equal((await rows(id)).find(r => r.kind === 'ready').state, 'superseded');
    await notifications.stage(channel); await notifications.sendOne(channel); // truthful store-payment record is still eligible
    const foreign = new WhatsAppNotifications(repository, transport, '902');
    await foreign.stage(outsiderChannel); await foreign.sendOne(outsiderChannel);
    assert.equal((await pool.query('SELECT count(*) FROM whatsapp_notifications WHERE tenant_id=$1', [other.tenantId])).rows[0].count, '0');
    await pool.query("INSERT INTO channel_accounts(provider,external_account_id,tenant_id,branch_id) VALUES('whatsapp','903',$1,$2)", [scope.tenantId,scope.branchId]);
    const secondChannel = (await repository.channelIdentity('903'))!;
    await new WhatsAppNotifications(repository, transport, '903').stage(secondChannel);
    assert.equal((await pool.query("SELECT count(*) FROM whatsapp_notifications WHERE phone_id='903'")).rows[0].count, '0');
  });

  await t.test('bounded provider rejection retries and ambiguous sends never create duplicate domain effects', async () => {
    const rejected = await order('reject-notification', fresh());
    await action(rejected, 'accept'); await notifications.stage(channel);
    mode = 'reject';
    for (let i=0;i<5;i++) {
      await notifications.sendOne(channel);
      await pool.query("UPDATE whatsapp_notifications SET available_at=now() WHERE order_id=$1", [rejected]);
    }
    let row = (await rows(rejected))[0];
    assert.equal(row.state, 'failed'); assert.equal(row.attempts, 5);
    mode = 'normal';
    const ambiguous = await order('ambiguous-notification', fresh());
    await action(ambiguous, 'accept'); await notifications.stage(channel);
    mode = 'unknown';
    const before = sends.length;
    await Promise.all([notifications.sendOne(channel), new WhatsAppNotifications(new PostgresRepository(pool), transport, '901').sendOne(channel)]);
    mode = 'normal';
    await queue.tick();
    assert.equal(sends.length, before+1);
    row = (await rows(ambiguous))[0];
    assert.equal(row.state, 'needs_attention');
    assert.equal(row.error_code, 'send_outcome_unknown');
    assert.equal(row.attempts, 1);
    assert.equal((await pool.query('SELECT status,payment_state FROM orders WHERE id=$1', [ambiguous])).rows[0].status, 'preparing');
    assert.equal((await pool.query('SELECT payment_state FROM orders WHERE id=$1', [ambiguous])).rows[0].payment_state, 'due');
    assert.ok(!(JSON.stringify(await review.list(staff))).includes('private detail'));
  });

  await t.test('sandbox authorization stages one labeled acceptance and uncertain reversal suppresses pending readiness', async () => {
    await pool.query('UPDATE branches SET pay_at_pickup=false,sandbox_checkout=true WHERE tenant_id=$1 AND id=$2', [scope.tenantId,scope.branchId]);
    try {
      const id = await order('sandbox-notification', fresh(), 'en');
      let fixture: Record<string,unknown>;
      const gateway = new WebpaySandbox({commerceCode:'123456789012',apiKey:'synthetic-key',returnUrl:'https://example.test/sandbox/return',fetcher:async(_url,init)=>{
        if(init?.method==='POST') { fixture=JSON.parse(String(init.body)); return Response.json({token:'notification-fixture-token',url:'https://webpay3gint.transbank.cl/webpayserver/initTransaction'}); }
        return Response.json({...fixture,status:'AUTHORIZED',response_code:0});
      }});
      const sandbox = new SandboxPayments(repository,gateway);
      await sandbox.create(staff,id);
      await sandbox.returned('notification-fixture-token');
      const before=sends.length;
      await queue.tick(); await queue.tick();
      assert.equal(sends.length,before+1);
      assert.match(sends.at(-1)!.text,/SANDBOX TEST.*restaurant accepted/);
      await action(id,'ready'); await notifications.stage(channel);
      await pool.query("UPDATE orders SET payment_state='sandbox_review' WHERE id=$1",[id]);
      await notifications.sendOne(channel);
      assert.equal(sends.length,before+1);
      assert.equal((await rows(id)).find(r=>r.kind==='ready').state,'superseded');
    } finally {
      await pool.query('UPDATE branches SET pay_at_pickup=true,sandbox_checkout=false WHERE tenant_id=$1 AND id=$2', [scope.tenantId,scope.branchId]);
    }
  });

  await t.test('human help is bilingual, idempotent, scoped and auditable without pretending contact or allergy safety', async () => {
    await inbound('allergy-customer', 'English', fresh());
    await inbound('allergy-customer', '1', fresh());
    const id = await inbound('allergy-customer', 'I have an allergy to peanuts', fresh());
    await queue.enqueue(channel, [{ id, from: 'allergy-customer', text: 'I have an allergy to peanuts', timestamp: fresh() }]); await queue.tick();
    assert.match(sends.filter(s=>s.to==='allergy-customer').at(-1)!.text, /needs staff review.*Do not rely on this chat/);
    assert.equal((await pool.query('SELECT cart FROM conversations WHERE customer_id=$1', ['allergy-customer'])).rows[0].cart[0][1], 1);
    await inbound('spanish-help', 'ayuda', fresh());
    assert.match(sends.at(-1)!.text, /revisión del personal/);
    assert.equal(handoffReason('me cobraron dos veces'), 'unknown_request');
    assert.equal(handoffReason('pago duplicado'), 'payment_exception');
    assert.equal(handoffReason('where is pickup?'), 'unknown_request');
    const list = await review.list(readOnly);
    assert.equal(list.handoffs.filter(h=>h.reason==='allergy').length, 1);
    assert.ok(list.handoffs.length >= 2);
    const serialized = JSON.stringify(list);
    assert.ok(!/allergy-customer|peanuts|spanish-help|provider-/.test(serialized));
    assert.ok(list.notifications.every(n=>n.deliveryConfirmed===false));
    assert.deepEqual((await review.list(otherStaff)).handoffs, []);
    const handoff = list.handoffs[0];
    await assert.rejects(review.review(readOnly, handoff.id), {statusCode:403});
    await assert.rejects(review.review(otherStaff, handoff.id), {statusCode:409});
    const results = await Promise.allSettled([review.review(staff, handoff.id),review.review(staff, handoff.id)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    const success = results.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<{customerContacted:boolean}>;
    assert.equal(success.value.customerContacted,false);
    assert.equal((await pool.query('SELECT count(*) FROM audit_events WHERE action=$1',[`whatsapp.support.review:${handoff.id}`])).rows[0].count,'1');
    await pool.query('UPDATE access_tokens SET revoked_at=now() WHERE id=$1',[owner.tokenId]);
    await assert.rejects(review.list(staff),{statusCode:401});
  });
});

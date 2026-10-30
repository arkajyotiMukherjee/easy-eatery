import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WhatsAppQueue } from '../apps/server/src/persistence/whatsapp-queue.ts';
import { WhatsAppDeliveryError } from '../apps/server/src/integrations/whatsapp.ts';
import { createApp } from '../apps/server/src/app.ts';
import { issueStaffToken, migrate, PostgresRepository, seedBranch } from '../apps/server/src/persistence/database.ts';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Set TEST_DATABASE_URL to run the real PostgreSQL integration suite.');

test('PostgreSQL persistence and restaurant-scoped access', async t => {
  const admin = new Pool({ connectionString: url });
  const schema = `ee_test_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: url, max: 8, options: `-c search_path=${schema}` });
  const repository = new PostgresRepository(pool);
  t.after(async () => { await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); });
  await migrate(pool);
  await migrate(pool);
  const a = { tenantId: 'restaurant-a', branchId: 'main' };
  const b = { tenantId: 'restaurant-b', branchId: 'main' };
  const aOther = { tenantId: 'restaurant-a', branchId: 'second' };
  await seedBranch(pool, a, 'Mesa Sur', 'toteat', '111');
  await seedBranch(pool, b, 'Otra Mesa', 'fudo', '222');
  await seedBranch(pool, aOther, 'Mesa Norte', 'fudo', '333');
  const owner = await issueStaffToken(pool, a, 'Owner A', 'owner');
  const operator = await issueStaffToken(pool, a, 'Staff A', 'operator');
  const viewer = await issueStaffToken(pool, a, 'Viewer A', 'viewer');
  const otherOwner = await issueStaffToken(pool, b, 'Owner B', 'owner');
  const otherBranchOwner = await issueStaffToken(pool, aOther, 'Owner second branch', 'owner');
  const headers = (token: string) => ({ authorization: `Bearer ${token}`, 'accept-language': 'en' });
  const { app } = createApp({ repository });
  t.after(() => app.close());
  let orderId: string;
  const send = async (text: string, messageId: string, token = owner.token) => {
    const result = await app.inject({ method: 'POST', url: '/api/demo/messages', headers: headers(token), payload: { customerId: 'test-customer', messageId, text, locale: 'en' } });
    assert.equal(result.statusCode, 200, result.body);
    return result.json().reply;
  };

  await t.test('migration/seed is repeatable and tokens are hashed and restaurant scoped', async () => {
    assert.equal((await pool.query('SELECT count(*) FROM schema_migrations')).rows[0].count, '8');
    await seedBranch(pool, a, 'Ignored new name', 'fudo', '111');
    assert.equal((await pool.query('SELECT count(*) FROM products')).rows[0].count, '9');
    const identity = await repository.authenticate(owner.token);
    assert.equal(identity?.tenantId, a.tenantId);
    const hash = (await pool.query('SELECT token_hash FROM access_tokens WHERE id=$1', [owner.tokenId])).rows[0].token_hash;
    assert.equal(hash.length, 64);
    assert.notEqual(hash, owner.token);
    assert.equal((await app.inject({ url: '/api/dashboard', headers: headers('replace-with-a-long-random-value') })).statusCode, 401);
    assert.equal((await app.inject({ url: '/health' })).json().persistence, 'postgres');
  });

  await t.test('concurrent app instances deduplicate carts and confirmation under a branch lock', async () => {
    const second = createApp({ repository: new PostgresRepository(pool) });
    try {
      await Promise.all([send('1 x 2', 'same-event'), second.app.inject({ method: 'POST', url: '/api/demo/messages', headers: headers(owner.token), payload: { customerId: 'test-customer', messageId: 'same-event', text: '1 x 2', locale: 'en' } })]);
      await Promise.all([send('confirm', 'confirm-one'), send('confirm', 'confirm-two')]);
      const orders = (await app.inject({ url: '/api/dashboard', headers: headers(owner.token) })).json().orders;
      assert.equal(orders.length, 1);
      assert.equal(orders[0].total, 9000);
      assert.equal(orders[0].lines[0].quantity, 2);
      orderId = orders[0].id;
      assert.equal((await pool.query('SELECT count(*) FROM order_lines')).rows[0].count, '1');
      assert.equal((await pool.query('SELECT count(*) FROM payment_attempts')).rows[0].count, '1');
      assert.equal((await pool.query('SELECT count(*) FROM outbox')).rows[0].count, '1');
    } finally { await second.app.close(); }
  });

  await t.test('restaurant and branch isolation protects reads, writes, and requested scope overrides', async () => {
    for (const token of [otherOwner.token, otherBranchOwner.token]) {
      const result = await app.inject({ url: '/api/dashboard?tenantId=restaurant-a&branchId=main', headers: { ...headers(token), 'x-tenant-id': a.tenantId } });
      assert.equal(result.statusCode, 200);
      assert.equal(result.json().orders.length, 0);
      const write = await app.inject({ method: 'POST', url: `/api/demo/orders/${orderId}/pay`, headers: headers(token) });
      assert.equal(write.statusCode, 409);
      assert.match(write.json().error, /not found/);
    }
    const injectedScope = await app.inject({ method: 'POST', url: '/api/demo/messages', headers: headers(owner.token), payload: { customerId: 'a', text: 'confirm', tenantId: b.tenantId } });
    assert.equal(injectedScope.statusCode, 400);
    const identity = (await repository.authenticate(owner.token))!;
    await assert.rejects(repository.transaction(identity, 'test.scope', state => { state.tenant.id = b.tenantId; }));
  });

  await t.test('composite foreign keys reject cross-tenant and cross-branch references', async () => {
    await assert.rejects(pool.query(`INSERT INTO order_lines(tenant_id,branch_id,order_id,line_number,product_id,name,name_en,unit_price,quantity)
      VALUES($1,$2,$3,0,'1','x','x',1,1)`, [b.tenantId, b.branchId, orderId]), { code: '23503' });
    await assert.rejects(pool.query(`INSERT INTO conversations(tenant_id,branch_id,customer_id,locale,cart,order_id,expires_at)
      VALUES($1,$2,'bad-reference','en','[]',$3,now())`, [aOther.tenantId, aOther.branchId, orderId]), { code: '23503' });
  });

  await t.test('staff roles and revoked/expired/deactivated credentials fail closed', async () => {
    assert.equal((await app.inject({ url: '/api/dashboard', headers: headers(viewer.token) })).statusCode, 200);
    assert.equal((await app.inject({ method: 'POST', url: `/api/demo/orders/${orderId}/pay`, headers: headers(viewer.token) })).statusCode, 403);
    assert.equal((await app.inject({ method: 'POST', url: `/api/demo/orders/${orderId}/pay`, headers: headers(operator.token) })).statusCode, 200);
    await pool.query('UPDATE access_tokens SET revoked_at=now() WHERE id=$1', [viewer.tokenId]);
    assert.equal((await app.inject({ url: '/api/dashboard', headers: headers(viewer.token) })).statusCode, 401);
    await pool.query("UPDATE access_tokens SET expires_at=now()-interval '1 second' WHERE id=$1", [otherOwner.tokenId]);
    assert.equal(await repository.authenticate(otherOwner.token), null);
    await pool.query('UPDATE memberships SET active=false WHERE user_id=$1', [otherBranchOwner.userId]);
    assert.equal(await repository.authenticate(otherBranchOwner.token), null);
    // Role revocation between request authentication and work is checked again.
    const identity = (await repository.authenticate(operator.token))!;
    await pool.query("UPDATE memberships SET role='viewer' WHERE user_id=$1", [operator.userId]);
    await assert.rejects(repository.transaction(identity, 'demo.payment', () => {}));
  });

  await t.test('database writes and audit/outbox rows roll back together on failure', async () => {
    const identity = (await repository.authenticate(owner.token))!;
    const before = (await pool.query('SELECT count(*) FROM audit_events')).rows[0].count;
    const outboxBefore = (await pool.query('SELECT count(*) FROM outbox')).rows[0].count;
    await assert.rejects(repository.transaction(identity, 'test.rollback', state => {
      state.session('rollback-customer').cart.set('1', 1);
      state.createOrder('rollback-customer', state.session('rollback-customer').cart);
      // Fail after the new order, lines and outbox event have been staged in SQL.
      state.session('rollback-customer').locale = 'invalid' as any;
    }), { code: '23514' });
    assert.equal((await pool.query('SELECT count(*) FROM orders')).rows[0].count, '1');
    assert.equal((await pool.query('SELECT count(*) FROM audit_events')).rows[0].count, before);
    assert.equal((await pool.query('SELECT count(*) FROM outbox')).rows[0].count, outboxBefore);
    assert.equal((await pool.query("SELECT count(*) FROM conversations WHERE customer_id='rollback-customer'")).rows[0].count, '0');
    await assert.rejects(repository.transaction(identity, 'test.immutable', state => { state.order(orderId).lines[0].unitPrice = 1; }));
  });

  await t.test('new connection pool/app recovers orders, sessions, payment and POS state', async () => {
    const freshPool = new Pool({ connectionString: url, options: `-c search_path=${schema}` });
    const fresh = createApp({ repository: new PostgresRepository(freshPool) });
    try {
      const dashboard = (await fresh.app.inject({ url: '/api/dashboard', headers: headers(owner.token) })).json();
      assert.equal(dashboard.orders[0].id, orderId);
      assert.equal(dashboard.orders[0].status, 'preparing');
      assert.equal(dashboard.orders[0].posReference, `demo-kitchen-toteat-${orderId}`);
      assert.equal(dashboard.orders[0].customerId, undefined);
      assert.equal(dashboard.metrics.paidRevenue, 9000);
      const replay = await fresh.app.inject({ method: 'POST', url: '/api/demo/messages', headers: headers(owner.token), payload: { customerId: 'test-customer', messageId: 'same-event', text: '1 x 2', locale: 'en' } });
      assert.match(replay.json().reply, /9,000/);
      assert.equal((await pool.query('SELECT status FROM payment_attempts')).rows[0].status, 'simulated_paid');
    } finally { await fresh.app.close(); await freshPool.end(); }
    const script = `import { Pool } from 'pg';
      import { createApp } from './apps/server/src/app.ts';
      import { PostgresRepository } from './apps/server/src/persistence/database.ts';
      const pool = new Pool({connectionString:process.env.TEST_DATABASE_URL, options:'-c search_path='+process.env.EE_TEST_SCHEMA});
      const {app}=createApp({repository:new PostgresRepository(pool)});
      try { const result=await app.inject({url:'/api/dashboard',headers:{authorization:'Bearer '+process.env.EE_TEST_TOKEN}});
        if(result.statusCode!==200) throw new Error('Child process authentication failed');
        console.log(JSON.stringify({id:result.json().orders[0].id,total:result.json().metrics.paidRevenue}));
      } finally { await app.close(); await pool.end(); }`;
    const child = await promisify(execFile)(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', script], {
      env: { ...process.env, EE_TEST_SCHEMA: schema, EE_TEST_TOKEN: owner.token }, timeout: 15000,
    });
    assert.deepEqual(JSON.parse(child.stdout), { id: orderId, total: 9000 });
  });

  await t.test('signed callbacks map receiving phone IDs server-side and survive replay after restart', async () => {
    const sent: string[] = [];
    const config = { repository, appSecret: 'test-app-secret', phoneId: '111', transport: { sendText: async (_to: string, text: string) => { sent.push(text); } } };
    const payload = (phone: string) => JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: phone }, messages: [{ id: 'callback-one', from: 'callback-customer', timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: '2' } }] } }] }] });
    const deliver = (target: ReturnType<typeof createApp>, body: string) => target.app.inject({ method: 'POST', url: '/webhooks/whatsapp', headers: { 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=' + createHmac('sha256', 'test-app-secret').update(body).digest('hex') }, payload: body });
    const first = createApp(config);
    assert.equal((await deliver(first, payload('222'))).statusCode, 200);
    assert.equal(sent.length, 0);
    assert.equal((await deliver(first, payload('111'))).statusCode, 200);
    await first.app.close();
    const restarted = createApp(config);
    assert.equal((await deliver(restarted, payload('111'))).statusCode, 200);
    assert.equal(sent.length, 0); // Webhook ACK precedes asynchronous work.
    await restarted.queue!.tick();
    await restarted.app.close();
    assert.equal(sent.length, 1);
    const rows = await pool.query("SELECT tenant_id,branch_id,cart FROM conversations WHERE customer_id='callback-customer'");
    assert.equal(rows.rows.length, 1);
    assert.equal(rows.rows[0].tenant_id, a.tenantId);
    assert.deepEqual(rows.rows[0].cart, [['2', 1]]);
    const unknown = createApp({ ...config, phoneId: '999' });
    assert.equal((await deliver(unknown, payload('999'))).statusCode, 403);
    await unknown.app.close();
    await assert.rejects(seedBranch(pool, b, 'Other', 'fudo', '111'), /another branch/);
  });
  await t.test('versioned catalog APIs preserve quotes/mappings and enforce owner/operator/viewer scope', async () => {
    const scope = { tenantId: 'catalog-restaurant', branchId: 'main' };
    await seedBranch(pool, scope, 'Catalog Test', 'fudo');
    const cOwner = await issueStaffToken(pool, scope, 'Catalog Owner', 'owner');
    const cOperator = await issueStaffToken(pool, scope, 'Catalog Staff', 'operator');
    const cViewer = await issueStaffToken(pool, scope, 'Catalog Viewer', 'viewer');
    const read = async (token = cOwner.token) => (await app.inject({ url: '/api/catalog', headers: headers(token) })).json();
    const write = (input: unknown, token = cOwner.token) => app.inject({ method: 'POST', url: '/api/catalog', headers: headers(token), payload: input as any });
    const initial = await read(cViewer.token);
    const input = { expectedVersion: initial.version, manualApproved: true, products: initial.products.map((p: any) => ({ ...p, mappings: { toteat: `t-${p.id}`, fudo: `f-${p.id}` } })), availability: initial.availability };
    input.products[0].price = 5000;
    input.products[0].modifiers = [{ id: 'cheese', name: 'Queso', nameEn: 'Cheese', price: 500, available: true, mappings: { toteat: 't-cheese', fudo: 'f-cheese' } }];
    assert.equal((await write(input, cOperator.token)).statusCode, 403);
    assert.equal((await write(input, cViewer.token)).statusCode, 403);
    assert.equal((await write({ ...input, tenantId: 'restaurant-a' })).statusCode, 400);
    const saved = await write(input); assert.equal(saved.statusCode, 200, saved.body);
    const catalog = saved.json(); assert.equal(catalog.version, 2);
    const message = (text: string, id: string) => app.inject({ method: 'POST', url: '/api/demo/messages', headers: headers(cOwner.token), payload: { text, messageId: id, customerId: 'catalog-customer', locale: 'en' } });
    assert.match((await message('1+cheese x 2', 'cart')).json().reply, /11,000/);
    const modified = { expectedVersion: catalog.version, manualApproved: true, products: catalog.products, availability: catalog.availability };
    modified.products[0].price = 6000;
    assert.equal((await write(modified)).statusCode, 200);
    const review = await message('confirm', 'reconfirm-one');
    assert.match(review.json().reply, /changed or expired[\s\S]*13,000/);
    assert.equal((await pool.query('SELECT count(*) FROM orders WHERE tenant_id=$1', [scope.tenantId])).rows[0].count, '0');
    await message('confirm', 'reconfirm-two');
    const result = await app.inject({ url: '/api/dashboard', headers: headers(cOwner.token) });
    const order = result.json().orders[0];
    assert.equal(order.total, 13000);
    assert.equal(order.catalogVersion, 3);
    assert.equal(order.lines[0].providerProductId, 'f-1');
    assert.equal(order.lines[0].modifiers[0].providerId, 'f-cheese');
    const current = await read();
    const next = { expectedVersion: current.version, manualApproved: true, products: current.products, availability: current.availability };
    const attempts = await Promise.all([write(next), write(next)]);
    assert.deepEqual(attempts.map(r => r.statusCode).sort(), [200, 409]);
    const latest = await read();
    assert.equal((await app.inject({ method: 'POST', url: '/api/catalog/products/1/availability', headers: headers(cOperator.token), payload: { available: false, expectedVersion: latest.version } })).statusCode, 200);
    const afterStock = await read();
    assert.equal(afterStock.updatedAt, latest.updatedAt);
    assert.equal((await read(owner.token)).products[0].available, true);
    assert.equal((await app.inject({ method: 'POST', url: '/api/catalog/service', headers: headers(cViewer.token), payload: { acceptingOrders: false, shiftOpen: false, expectedVersion: afterStock.version } })).statusCode, 403);
    const beforeRestart = await pool.query('SELECT quote FROM conversations WHERE tenant_id=$1', [scope.tenantId]);
    assert.equal(beforeRestart.rows[0].quote.total, 13000);
    const freshPool = new Pool({ connectionString: url, options: `-c search_path=${schema}` });
    const fresh = createApp({ repository: new PostgresRepository(freshPool) });
    try {
      const persisted = (await fresh.app.inject({ url: '/api/dashboard', headers: headers(cOwner.token) })).json().orders[0];
      assert.deepEqual(persisted.lines, order.lines);
      assert.equal(persisted.total, 13000);
      assert.equal((await fresh.app.inject({ url: '/api/catalog', headers: headers(cOwner.token) })).json().products[0].available, false);
    } finally { await fresh.app.close(); await freshPool.end(); }
    const directory = await mkdtemp(join(tmpdir(), 'easy-eatery-catalog-'));
    try {
      const finalCatalog = await read();
      const filename = join(directory, 'catalog.json');
      await writeFile(filename, JSON.stringify({ expectedVersion: finalCatalog.version, manualApproved: true, products: finalCatalog.products, availability: finalCatalog.availability }));
      const scopedUrl = new URL(url!); scopedUrl.searchParams.set('options', `-c search_path=${schema}`);
      const cli = await promisify(execFile)(process.execPath, ['--import', 'tsx', 'scripts/import-catalog.ts', filename], {
        env: { ...process.env, DATABASE_URL: scopedUrl.toString(), CATALOG_STAFF_TOKEN: cOwner.token }, timeout: 15000,
      });
      assert.match(cli.stdout, new RegExp(`Catalog version ${finalCatalog.version + 1} saved`));
    } finally { await rm(directory, { recursive: true }); }
  });
  await t.test('local pickup persists unpaid kitchen state and audited store payment independently', async () => {
    const scope = { tenantId: 'pickup-only', branchId: 'main' };
    await seedBranch(pool, scope, 'Local Kitchen', 'toteat');
    await pool.query('UPDATE branches SET pay_at_pickup=true WHERE tenant_id=$1', [scope.tenantId]);
    const staff = await issueStaffToken(pool, scope, 'Pickup operator', 'operator');
    const readOnly = await issueStaffToken(pool, scope, 'Pickup viewer', 'viewer');
    const h = headers(staff.token);
    for (const text of ['1','confirm']) assert.equal((await app.inject({method:'POST',url:'/api/demo/messages',headers:h,payload:{customerId:'pickup-person',messageId:text,text,locale:'en'}})).statusCode,200);
    const ticket = (await app.inject({url:'/api/dashboard',headers:h})).json().orders[0];
    const action = (suffix: string, token = staff.token) => app.inject({method:'POST',url:`/api/pickup/orders/${ticket.id}/${suffix}`,headers:headers(token)});
    assert.equal((await action('accept',readOnly.token)).statusCode,403);
    const outsider = await issueStaffToken(pool, b, 'Fresh outsider', 'owner');
    assert.equal((await action('accept',outsider.token)).statusCode,409);
    assert.equal((await action('accept')).statusCode,200);
    const fresh = createApp({repository:new PostgresRepository(pool)});
    try {
      const dashboard = (await fresh.app.inject({url:'/api/dashboard',headers:h})).json();
      assert.equal(dashboard.orders[0].status,'preparing');
      assert.equal(dashboard.orders[0].paymentState,'due');
      assert.equal(dashboard.metrics.paidRevenue,0);
      assert.equal(dashboard.orders[0].posReference,undefined);
    } finally { await fresh.app.close(); }
    assert.equal((await app.inject({method:'POST',url:`/api/demo/orders/${ticket.id}/status`,headers:h,payload:{status:'ready'}})).statusCode,200);
    await Promise.all([action('record-store-payment'),action('record-store-payment')]);
    assert.equal((await pool.query('SELECT count(*) FROM payment_attempts WHERE tenant_id=$1',[scope.tenantId])).rows[0].count,'0');
    assert.equal((await pool.query("SELECT count(*) FROM outbox WHERE tenant_id=$1 AND payload->>'paymentState'='store_paid'",[scope.tenantId])).rows[0].count,'1');
    assert.equal((await pool.query("SELECT count(*) FROM audit_events WHERE tenant_id=$1 AND action='pickup.record-store-payment'",[scope.tenantId])).rows[0].count,'2');
  });

  await t.test('durable inbox/outbox serializes conversations, retries rejected sends and parks unknown outcomes', async () => {
    const scope = {tenantId:'queue-restaurant',branchId:'main'};
    await seedBranch(pool,scope,'Queue Test','toteat','444');
    const identity=(await repository.channelIdentity('444'))!;
    const attempts:string[]=[];
    let rejectOnce=true;
    const transport={sendText:async (to:string,text:string)=>{
      attempts.push(to);
      if(to==='retry-person' && rejectOnce) { rejectOnce=false; throw new WhatsAppDeliveryError(true); }
      if(to==='uncertain-person') throw new Error('Synthetic socket timeout');
      return {id:'provider-'+attempts.length};
    }};
    const queue=new WhatsAppQueue(repository,transport,'444');
    await Promise.all([queue.enqueue(identity,[{id:'one',from:'retry-person',text:'1', timestamp: Math.floor(Date.now() / 1000) }]),queue.enqueue(identity,[{id:'one',from:'retry-person',text:'1', timestamp: Math.floor(Date.now() / 1000) }])]);
    await queue.enqueue(identity,[{id:'two',from:'retry-person',text:'confirm', timestamp: Math.floor(Date.now() / 1000) },{id:'other',from:'other-person',text:'hello', timestamp: Math.floor(Date.now() / 1000) },{id:'uncertain',from:'uncertain-person',text:'hello', timestamp: Math.floor(Date.now() / 1000) }]);
    await Promise.all([queue.tick(),new WhatsAppQueue(repository,transport,'444').tick()]);
    let rows=await pool.query('SELECT message_id,state,attempts FROM whatsapp_jobs WHERE tenant_id=$1 ORDER BY id',[scope.tenantId]);
    assert.equal(rows.rows.length,4);
    assert.equal(rows.rows.find(r=>r.message_id==='one').state,'reply_pending');
    assert.equal(rows.rows.find(r=>r.message_id==='two').state,'pending');
    assert.equal(rows.rows.find(r=>r.message_id==='other').state,'sent');
    assert.equal(rows.rows.find(r=>r.message_id==='uncertain').state,'needs_attention');
    await pool.query("UPDATE whatsapp_jobs SET available_at=now() WHERE tenant_id=$1 AND state='reply_pending'",[scope.tenantId]);
    await new WhatsAppQueue(repository,transport,'444').tick();
    assert.equal((await pool.query('SELECT count(*) FROM orders WHERE tenant_id=$1',[scope.tenantId])).rows[0].count,'1');
    assert.deepEqual((await pool.query("SELECT cart FROM conversations WHERE tenant_id=$1 AND customer_id='retry-person'",[scope.tenantId])).rows[0].cart,[['1',1]]);
    const sendCount=attempts.length;
    await queue.tick();
    assert.equal(attempts.length,sendCount); // Unknown sends are never replayed automatically.
    // Crash after claiming but before sending: expiration is also uncertain, not a new send.
    await queue.enqueue(identity,[{id:'crash',from:'crash-person',text:'hello', timestamp: Math.floor(Date.now() / 1000) }]);
    await queue.processOne(identity);
    await pool.query("UPDATE whatsapp_jobs SET state='sending',lease_until=now()-interval '1 minute' WHERE tenant_id=$1 AND message_id='crash'",[scope.tenantId]);
    await queue.tick();
    assert.equal((await pool.query("SELECT state FROM whatsapp_jobs WHERE tenant_id=$1 AND message_id='crash'",[scope.tenantId])).rows[0].state,'needs_attention');
    assert.equal(attempts.length,sendCount);
    const qOwner=await issueStaffToken(pool,scope,'Queue owner','owner');
    const snapshot=await app.inject({url:'/api/whatsapp/delivery',headers:headers(qOwner.token)});
    assert.equal(snapshot.statusCode,200);
    assert.equal(snapshot.body.includes('retry-person'),false);
    assert.equal(snapshot.json().counts.find((r:any)=>r.state==='needs_attention').count,2);
    const outsider=await issueStaffToken(pool,b,'Queue outsider','owner');
    const other=(await app.inject({url:'/api/whatsapp/delivery',headers:headers(outsider.token)})).json();
    assert.equal(other.counts.some((r:any)=>r.state==='needs_attention'),false);
  });

  await t.test('processing failure rolls back order and reply together and stops after bounded retries', async () => {
    const scope={tenantId:'queue-failure',branchId:'main'};
    await seedBranch(pool,scope,'Failure Test','toteat','555');
    const identity=(await repository.channelIdentity('555'))!;
    const queue=new WhatsAppQueue(repository,{sendText:async()=>{}},'555');
    await queue.enqueue(identity,[{id:'item',from:'person',text:'1', timestamp: Math.floor(Date.now() / 1000) }]);
    await queue.tick();
    await pool.query(`CREATE FUNCTION reject_queue_order() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.tenant_id='queue-failure' THEN RAISE EXCEPTION 'synthetic failure'; END IF; RETURN NEW; END $$`);
    await pool.query('CREATE TRIGGER reject_queue_order BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION reject_queue_order()');
    await queue.enqueue(identity,[{id:'confirm',from:'person',text:'confirm', timestamp: Math.floor(Date.now() / 1000) }]);
    for(let i=0;i<5;i++) {
      await pool.query("UPDATE whatsapp_jobs SET available_at=now() WHERE tenant_id=$1 AND state='pending'",[scope.tenantId]);
      await queue.tick();
    }
    const result=(await pool.query("SELECT state,attempts,response FROM whatsapp_jobs WHERE tenant_id=$1 AND message_id='confirm'",[scope.tenantId])).rows[0];
    assert.equal(result.state,'failed'); assert.equal(result.attempts,5); assert.equal(result.response,null);
    assert.equal((await pool.query('SELECT count(*) FROM orders WHERE tenant_id=$1',[scope.tenantId])).rows[0].count,'0');
    assert.equal((await pool.query("SELECT count(*) FROM inbox WHERE tenant_id=$1 AND event_key LIKE '%:confirm'",[scope.tenantId])).rows[0].count,'0');
    await pool.query('DROP TRIGGER reject_queue_order ON orders');
    await pool.query('DROP FUNCTION reject_queue_order()');
  });

});

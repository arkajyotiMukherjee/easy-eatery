import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { createApp } from '../apps/server/src/app.ts';
import { migrate, seedBranch, issueStaffToken, PostgresRepository } from '../apps/server/src/persistence/database.ts';
import { SandboxPayments } from '../apps/server/src/persistence/sandbox-payments.ts';
import { WebpaySandbox } from '../apps/server/src/integrations/webpay.ts';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Set disposable TEST_DATABASE_URL to run sandbox integration tests.');

test('durable sandbox checkout and local fulfillment (mock gateway only)', async t => {
  const admin = new Pool({ connectionString: url });
  const schema = `ee_sandbox_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: url, max: 8, options: `-c search_path=${schema}` });
  t.after(async () => { await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); });
  await migrate(pool);
  await migrate(pool);
  const scope = { tenantId: 'sandbox-restaurant', branchId: 'main' };
  await seedBranch(pool,scope,'Synthetic sandbox kitchen','toteat');
  await seedBranch(pool,{...scope,branchId:'other'},'Other branch','fudo');
  await pool.query('UPDATE branches SET sandbox_checkout=true WHERE tenant_id=$1 AND id=$2',[scope.tenantId,scope.branchId]);
  const owner = await issueStaffToken(pool,scope,'Synthetic Owner','owner');
  const viewer = await issueStaffToken(pool,scope,'Synthetic Viewer','viewer');
  const foreign = await issueStaffToken(pool,{...scope,branchId:'other'},'Foreign Owner','owner');
  const headers = (value = owner.token) => ({ authorization:`Bearer ${value}`,'accept-language':'en' });
  const fixtures = new Map<string,Record<string,unknown>>();
  let creates = 0, commits = 0, statuses = 0, reversals = 0;
  let createFailure = false, commitFailure = false, wrongAmount = false, reverseFailure = false;
  let commitHold: Promise<void> | undefined;
  const fetcher: typeof fetch = async (input,init) => {
    assert.equal(new URL(String(input)).origin,'https://webpay3gint.transbank.cl');
    if (init?.method === 'POST' && String(input).endsWith('/refunds')) {
      reversals++;
      const token = String(input).split('/').at(-2)!;
      const fixture = fixtures.get(token)!;
      assert.equal(JSON.parse(String(init.body)).amount, fixture.amount);
      if (reverseFailure) throw new Error('synthetic uncertain reversal');
      fixture.status = 'REVERSED';
      return Response.json({ type: 'REVERSED' });
    }
    if (init?.method === 'POST') {
      creates++;
      const request = JSON.parse(String(init.body));
      if (createFailure) throw new Error('synthetic timeout; outcome unknown');
      const token = `synthetic-${creates}`;
      fixtures.set(token,{...request,status:'INITIALIZED',response_code:0});
      return Response.json({token,url:'https://webpay3gint.transbank.cl/webpayserver/initTransaction'});
    }
    const token = String(input).split('/').at(-1)!;
    const fixture = fixtures.get(token)!;
    assert.ok(fixture);
    if (init?.method === 'PUT') {
      commits++;
      fixture.status='AUTHORIZED';
      if (commitHold) await commitHold;
      if (commitFailure) throw new Error('synthetic dropped response after acceptance');
    } else statuses++;
    return Response.json({...fixture,...(wrongAmount?{amount:4501}:{})});
  };
  const gateway = new WebpaySandbox({commerceCode:'123456789012',apiKey:'synthetic-fixture-key',returnUrl:'https://example.test/sandbox/return',fetcher});
  const repository = new PostgresRepository(pool);
  const service = new SandboxPayments(repository,gateway);
  const {app} = createApp({repository,sandboxPayments:service});
  t.after(()=>app.close());
  const order = async (locale:'en'|'es'='en') => {
    const customerId=randomUUID();
    const send=async(text:string)=>{
      const r=await app.inject({method:'POST',url:'/api/demo/messages',headers:headers(),payload:{customerId,text,locale}});
      assert.equal(r.statusCode,200,r.body);
      return r.json().reply as string;
    };
    await send('1');
    const reply=await send('confirm');
    assert.match(reply,locale==='en'?/No real money received/:/No se recibió dinero real/);
    const row=await pool.query('SELECT id FROM orders WHERE customer_id=$1',[customerId]);
    return row.rows[0].id as string;
  };
  const checkout=async(id:string)=>app.inject({method:'POST',url:`/api/sandbox/orders/${id}/checkout`,headers:headers(),payload:{}});
  const row=async(id:string)=>(await pool.query('SELECT * FROM sandbox_attempts WHERE order_id=$1',[id])).rows[0];
  const returned=async(token:string,cancelled=false)=>app.inject({method:'POST',url:'/sandbox/return',headers:{'content-type':'application/x-www-form-urlencoded'},payload:new URLSearchParams({[cancelled?'TBK_TOKEN':'token_ws']:token}).toString()});

  await t.test('sandbox snapshots cannot use simulation, cash collection or unpaid kitchen acceptance',async()=>{
    const id=await order('es');
    const current=(await pool.query('SELECT * FROM orders WHERE id=$1',[id])).rows[0];
    assert.equal(current.payment_method,'webpay_sandbox');
    assert.equal(current.fulfillment,'local');
    for(const path of [`/api/demo/orders/${id}/pay`,`/api/pickup/orders/${id}/accept`,`/api/pickup/orders/${id}/record-store-payment`]) {
      assert.equal((await app.inject({method:'POST',url:path,headers:headers(),payload:{}})).statusCode,409);
    }
    assert.equal((await app.inject({method:'POST',url:`/api/demo/orders/${id}/status`,headers:headers(),payload:{status:'ready'}})).statusCode,409);
    await pool.query('UPDATE branches SET sandbox_checkout=false,pay_at_pickup=true WHERE tenant_id=$1 AND id=$2',[scope.tenantId,scope.branchId]);
    assert.equal((await checkout(id)).statusCode,200); // Confirmed method is immutable despite branch mode change.
    await pool.query('UPDATE branches SET sandbox_checkout=true,pay_at_pickup=false WHERE tenant_id=$1 AND id=$2',[scope.tenantId,scope.branchId]);
  });

  await t.test('scoped staff authorization and one durable attempt before concurrent gateway creation',async()=>{
    const id=await order();
    const count=creates;
    for (const token of [viewer.token,foreign.token]) {
      assert.equal((await app.inject({method:'POST',url:`/api/sandbox/orders/${id}/checkout`,headers:headers(token),payload:{}})).statusCode,token===viewer.token?403:409);
    }
    assert.equal(creates,count);
    const responses=await Promise.all([checkout(id),checkout(id)]);
    assert.ok(responses.every(r=>r.statusCode===200));
    assert.equal(creates,count+1);
    assert.equal((await pool.query('SELECT count(*) FROM sandbox_attempts WHERE order_id=$1',[id])).rows[0].count,'1');
    const issued=responses.map(r=>r.json()).find(r=>r.checkoutPath);
    assert.ok(issued);
    const handoff=await app.inject(issued.checkoutPath);
    assert.equal(handoff.statusCode,200);
    assert.match(String(handoff.headers['content-security-policy']),/form-action https:\/\/webpay3gint\.transbank\.cl/);
    assert.match(handoff.body,/method="post"/);
    assert.ok(!handoff.body.includes('synthetic-fixture-key'));
    const list=await app.inject({url:'/api/sandbox/attempts',headers:headers(viewer.token)});
    assert.equal(list.statusCode,200);
    assert.ok(!list.body.includes('provider_token')&&!list.body.includes('synthetic-fixture-key')&&!list.body.includes('synthetic-1'));
    const r=await row(id);
    assert.equal((await app.inject({method:'POST',url:`/api/sandbox/attempts/${r.id}/reconcile`,headers:headers(viewer.token),payload:{}})).statusCode,403);
    await pool.query('UPDATE sandbox_attempts SET expires_at=now()-interval \'1 second\' WHERE id=$1',[r.id]);
    assert.equal((await app.inject(issued.checkoutPath)).statusCode,401);
    // Late authoritative completion is reconciled; link expiry alone is not a payment outcome.
    assert.equal((await returned(r.provider_token)).statusCode,200);
  });

  await t.test('duplicate/concurrent browser returns authorize once, local ticket and sandbox totals stay separate',async()=>{
    const id=await order();
    assert.equal((await checkout(id)).statusCode,200);
    const r=await row(id);
    const before=commits;
    const result=await Promise.all([returned(r.provider_token),returned(r.provider_token),returned(r.provider_token)]);
    assert.ok(result.every(r=>r.statusCode===200));
    assert.equal(commits,before+1);
    const current=(await pool.query('SELECT * FROM orders WHERE id=$1',[id])).rows[0];
    assert.equal(current.payment_state,'sandbox_authorized');
    assert.equal(current.status,'preparing');
    assert.equal(current.pos_reference,null);
    assert.equal((await pool.query("SELECT count(*) FROM outbox WHERE event_key=$1",[`sandbox-authorized:${r.id}`])).rows[0].count,'1');
    const dashboard=(await app.inject({url:'/api/dashboard',headers:headers()})).json();
    assert.ok(dashboard.metrics.testAuthorizedRevenue>=4500);
    assert.equal(dashboard.metrics.paidRevenue,0);
    assert.equal(dashboard.metrics.paidOrders,0);
    for(const status of ['ready','collected']) assert.equal((await app.inject({method:'POST',url:`/api/demo/orders/${id}/status`,headers:headers(),payload:{status}})).statusCode,200);
  });

  await t.test('ambiguous commit survives service restart and reconciles by status without recommit',async()=>{
    const id=await order();
    await checkout(id);
    const r=await row(id);
    commitFailure=true;
    const before=commits;
    assert.equal((await returned(r.provider_token)).statusCode,409);
    commitFailure=false;
    assert.equal((await row(id)).state,'needs_attention');
    assert.equal((await returned(r.provider_token)).statusCode,200);
    assert.equal(commits,before+1);
    const restarted=new SandboxPayments(new PostgresRepository(pool),gateway);
    const identity=(await repository.authenticate(owner.token))!;
    const observed=await restarted.reconcile(identity,r.id);
    assert.equal(observed.state,'authorized');
    assert.equal(commits,before+1);
    assert.equal((await pool.query('SELECT status FROM orders WHERE id=$1',[id])).rows[0].status,'preparing');
  });

  await t.test('cancellation and forged/wrong-total responses cannot authorize or silently switch payment method',async()=>{
    const id=await order();
    await checkout(id);
    const r=await row(id);
    const before=commits;
    assert.equal((await returned(r.provider_token,true)).statusCode,200);
    assert.equal(commits,before);
    assert.equal((await row(id)).state,'ready'); // An INITIALIZED status still needs the first commit.
    wrongAmount=true;
    assert.equal((await returned(r.provider_token)).statusCode,409);
    wrongAmount=false;
    assert.equal((await row(id)).state,'needs_attention');
    assert.equal((await pool.query('SELECT payment_state FROM orders WHERE id=$1',[id])).rows[0].payment_state,'due');
    const spoof=await app.inject({method:'POST',url:'/sandbox/return',payload:{token_ws:r.provider_token,amount:4500,status:'AUTHORIZED'}});
    assert.equal(spoof.statusCode,400);
    assert.equal((await checkout(id)).json().state,'needs_attention');
    assert.equal((await app.inject({method:'POST',url:`/api/pickup/orders/${id}/record-store-payment`,headers:headers(),payload:{}})).statusCode,409);
  });

  await t.test('unknown create outcome parks the durable attempt and never creates another checkout',async()=>{
    const id=await order();
    createFailure=true;
    const before=creates;
    assert.equal((await checkout(id)).statusCode,409);
    createFailure=false;
    assert.equal((await row(id)).state,'needs_attention');
    assert.equal((await checkout(id)).json().state,'needs_attention');
    assert.equal(creates,before+1);
  });

  await t.test('expired commit claim and concurrent reconciliation cannot duplicate ticket or overwrite newer evidence',async()=>{
    const id=await order();
    await checkout(id);
    const r=await row(id);
    let release!:()=>void;
    commitHold=new Promise<void>(resolve=>{release=resolve;});
    const pending=returned(r.provider_token);
    for(let i=0;i<100;i++) {
      if((await row(id)).commit_started) break;
      await new Promise(resolve=>setTimeout(resolve,5));
    }
    await pool.query("UPDATE sandbox_attempts SET claim_until=now()-interval '1 second' WHERE id=$1",[r.id]);
    const identity=(await repository.authenticate(owner.token))!;
    assert.equal((await service.reconcile(identity,r.id)).state,'authorized');
    release();
    commitHold=undefined;
    assert.equal((await pending).statusCode,409);
    assert.equal((await row(id)).state,'authorized');
    assert.equal((await pool.query('SELECT count(*) FROM outbox WHERE event_key=$1',[`sandbox-authorized:${r.id}`])).rows[0].count,'1');
  });
  await t.test('abandoned creation becomes visibly parked and merchant mismatch cannot issue a second attempt', async () => {
    const id = await order();
    await checkout(id);
    const r = await row(id);
    await pool.query("UPDATE sandbox_attempts SET state='creating',provider_token=NULL,token_hash=NULL,claim_until=now()-interval '1 second' WHERE id=$1", [r.id]);
    const identity = (await repository.authenticate(owner.token))!;
    assert.equal((await service.list(identity)).attempts.find(a=>a.orderId===id)!.state, 'needs_attention');
    assert.equal((await service.reconcile(identity,r.id)).state, 'needs_attention');
    assert.equal((await row(id)).state, 'needs_attention');
    const count=creates;
    const wrongMerchant = new SandboxPayments(repository,new WebpaySandbox({commerceCode:'999999999999',apiKey:'synthetic-key',returnUrl:'https://example.test/sandbox/return',fetcher}));
    await assert.rejects(wrongMerchant.create(identity,id),{statusCode:409});
    assert.equal(creates,count);
  });

  await t.test('declines and partial reversal evidence cannot masquerade as approval or a full refund', async () => {
    const identity=(await repository.authenticate(owner.token))!;
    const declined=await order();await checkout(declined);const declinedRow=await row(declined);
    fixtures.get(declinedRow.provider_token)!.status='FAILED';
    fixtures.get(declinedRow.provider_token)!.response_code=-1;
    assert.equal((await service.reconcile(identity,declinedRow.id)).state,'declined');
    assert.equal((await pool.query('SELECT payment_state FROM orders WHERE id=$1',[declined])).rows[0].payment_state,'due');
    const partial=await order();await checkout(partial);const partialRow=await row(partial);await returned(partialRow.provider_token);
    fixtures.get(partialRow.provider_token)!.status='PARTIALLY_NULLIFIED';
    assert.equal((await service.reconcile(identity,partialRow.id)).state,'needs_attention');
    assert.equal((await pool.query('SELECT payment_state FROM orders WHERE id=$1',[partial])).rows[0].payment_state,'sandbox_review');
    assert.equal((await app.inject({method:'POST',url:`/api/demo/orders/${partial}/status`,headers:headers(),payload:{status:'ready'}})).statusCode,409);
  });

  await t.test('full sandbox reversal requires a current owner, explicit review, and a single outbound claim', async () => {
    const operator = await issueStaffToken(pool,scope,'Synthetic Operator','operator');
    const id=await order(); await checkout(id); const r=await row(id); await returned(r.provider_token);
    const reverse = (credential:string, revision:number) => app.inject({method:'POST',url:`/api/sandbox/attempts/${r.id}/reverse`,headers:headers(credential),payload:{expectedVersion:revision,confirmation:'reverse_sandbox_test_authorization'}});
    const current=await row(id); const before=reversals;
    for(const credential of [operator.token,viewer.token]) assert.equal((await reverse(credential,current.revision)).statusCode,403);
    const result=await Promise.all([reverse(owner.token,current.revision),reverse(owner.token,current.revision)]);
    assert.deepEqual(result.map(r=>r.statusCode).sort(),[200,409]);
    assert.equal(reversals,before+1);
    assert.equal((await row(id)).state,'reversed');
    assert.equal((await pool.query('SELECT payment_state FROM orders WHERE id=$1',[id])).rows[0].payment_state,'sandbox_reversed');
    assert.equal((await reverse(owner.token,(await row(id)).revision)).statusCode,409);
    assert.equal((await app.inject({method:'POST',url:`/api/demo/orders/${id}/status`,headers:headers(),payload:{status:'ready'}})).statusCode,409);
    assert.equal((await pool.query('SELECT count(*) FROM outbox WHERE event_key=$1',[`sandbox-authorized:${r.id}`])).rows[0].count,'1');
  });

  await t.test('unknown reversal blocks collection across status/restart and never retries the refund', async () => {
    const id=await order(); await checkout(id); const r=await row(id); await returned(r.provider_token);
    const identity=(await repository.authenticate(owner.token))!;
    reverseFailure=true; const before=reversals;
    await assert.rejects(service.reverse(identity,r.id,(await row(id)).revision),{statusCode:409});
    reverseFailure=false;
    const restarted=new SandboxPayments(new PostgresRepository(pool),gateway);
    assert.equal((await restarted.reconcile(identity,r.id)).state,'needs_attention'); // AUTHORIZED is not proof an uncertain reversal failed.
    assert.equal((await pool.query('SELECT payment_state FROM orders WHERE id=$1',[id])).rows[0].payment_state,'sandbox_review');
    await assert.rejects(restarted.reverse(identity,r.id,(await row(id)).revision),{statusCode:409});
    assert.equal(reversals,before+1);
    fixtures.get(r.provider_token)!.status='REVERSED';
    assert.equal((await restarted.reconcile(identity,r.id)).state,'reversed');
    assert.equal((await pool.query('SELECT payment_state FROM orders WHERE id=$1',[id])).rows[0].payment_state,'sandbox_reversed');
  });
  assert.ok(statuses>0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../apps/server/src/app.ts';
import { LoyaltyDemo, LoyaltyError } from '../apps/server/src/modules/loyalty/service.ts';

const token = 'synthetic-loyalty-test-key';
const sale = (eventId: string, amountClp = 5500, memberId = 'demo-ana') => ({ eventId, amountClp, memberId, channel: 'pickup' as const });

test('loyalty floors each integer CLP purchase, rejects invalid amounts, isolates members and guards replay payloads', async () => {
  const demo = await LoyaltyDemo.open();
  const results = await Promise.all(Array.from({length: 10}, () => demo.sale(sale('receipt-1'))));
  assert.ok(results.every(r => r.tokens === 5));
  await assert.rejects(demo.sale(sale('receipt-1', 6000)), { code: 'conflict' });
  await assert.rejects(demo.sale(sale('receipt-1', 5500, 'demo-alex')), { code: 'conflict' });
  for (const amount of [0, -1, 2.5, NaN, Infinity, 10000001]) assert.throws(() => demo.sale(sale('bad', amount)), LoyaltyError);
  await demo.sale(sale('receipt-2', 999));
  const state = await demo.read();
  assert.equal(state.members[0].balance, 5); assert.equal(state.members[1].balance, 0);
  assert.equal(state.ledger.length, 2); assert.equal(state.sales.length, 2);
});

test('concurrent redemption cannot overspend; issued reward is snapshotted and consumed once', async () => {
  const demo = await LoyaltyDemo.open(); await demo.sale(sale('receipt', 5000));
  const results = await Promise.allSettled([demo.redeem('demo-ana', 'coffee', 'r1'), demo.redeem('demo-ana', 'coffee', 'r2')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const first = (results[0] as PromiseFulfilledResult<any>).value;
  assert.deepEqual(await demo.redeem('demo-ana', 'coffee', 'r1'), first);
  const before = await demo.read();
  await demo.configure(2000, before.revision, { coffee: 7, discount: 12 });
  const after = await demo.read(); assert.equal(after.redemptions[0].cost, 5);
  assert.equal(after.program.rewards[0].cost, 7);
  await demo.use(first.id, 'use1', first.authorization, 'Demo manual completion', 'test-receipt'); await demo.use(first.id, 'use1', first.authorization, 'Demo manual completion', 'test-receipt');
  await assert.rejects(demo.use(first.id, 'use2', first.authorization, 'Demo manual completion', 'test-receipt'), { code: 'used' });
  assert.equal((await demo.read()).ledger.length, 2);
});

test('full refund reverses original earning once, even after program changes or reward spend; debt blocks redemption', async () => {
  const demo = await LoyaltyDemo.open(); await demo.sale(sale('receipt', 10000));
  await demo.redeem('demo-ana', 'coffee', 'r1');
  await demo.configure(2000, (await demo.read()).revision);
  await Promise.all([demo.reverse('receipt', 'refund1'), demo.reverse('receipt', 'refund2')]);
  const state = await demo.read(); assert.equal(state.members[0].balance, -5);
  assert.equal(state.ledger.filter(l => l.kind === 'reverse').length, 1);
  assert.equal(state.ledger.reduce((sum, l) => sum + l.delta, 0), -5);
  await assert.rejects(demo.redeem('demo-ana', 'coffee', 'r2'), { code: 'balance' });
  await demo.sale(sale('new-receipt', 20000));
  assert.equal((await demo.read()).members[0].balance, 5);
  await assert.rejects(demo.configure(1000, state.revision), { code: 'conflict' });
});

test('Wallet outage leaves ledger committed, shows stale projection, then recovers without replaying earning', async () => {
  const demo = await LoyaltyDemo.open(); await demo.sync('demo-ana');
  await demo.availability(false); await demo.sale(sale('receipt'));
  await assert.rejects(demo.sync('demo-ana'), { code: 'wallet' });
  let state = await demo.read(); assert.equal(state.members[0].balance, 5); assert.equal(state.wallets[0].balance, 0);
  await demo.availability(true); await demo.sync('demo-ana');
  state = await demo.read(); assert.equal(state.wallets[0].balance, 5);
  await demo.sync('demo-ana'); assert.equal((await demo.read()).revision, state.revision);
});

test('atomic snapshot survives restart with replay and reward use protection; reset restores synthetic seed', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'loyalty-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'state.json'); const demo = await LoyaltyDemo.open(file);
  await demo.sale(sale('receipt')); const reward = await demo.redeem('demo-ana', 'coffee', 'r1'); await demo.use(reward.id, 'u1', reward.authorization, 'Demo completion', 'test-ref');
  const restored = await LoyaltyDemo.open(file); await restored.sale(sale('receipt')); await restored.use(reward.id, 'u1', reward.authorization, 'Demo completion', 'test-ref');
  assert.equal((await restored.read()).members[0].balance, 0);
  await assert.rejects(restored.use(reward.id, 'u2', reward.authorization, 'Demo completion', 'test-ref'), { code: 'used' });
  await restored.reset(); const reset = await LoyaltyDemo.open(file);
  assert.equal((await reset.read()).ledger.length, 0);
  await reset.sale(sale('receipt')); assert.equal((await reset.read()).members[0].balance, 5);
  assert.ok((await readFile(file, 'utf8')).includes('synthetic-restaurant'));
  await writeFile(file, '{broken'); await assert.rejects(LoyaltyDemo.open(file));
});

test('failed snapshot write does not publish partial earning and can retry safely', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'loyalty-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'state.json'); const demo = await LoyaltyDemo.open(file);
  await writeFile(dir + '/block', 'file');
  // A directory at the temporary file path deterministically rejects writing.
  const { mkdir } = await import('node:fs/promises'); await mkdir(file + '.tmp');
  await assert.rejects(demo.sale(sale('receipt')));
  assert.equal((await demo.read()).ledger.length, 0);
  await rm(file + '.tmp', { recursive: true }); await demo.sale(sale('receipt'));
  assert.equal((await demo.read()).members[0].balance, 5);
});

test('loyalty HTTP is opt-in, bearer protected, strict, bilingual and separate from restaurant database', async t => {
  const demo = await LoyaltyDemo.open(); const { app } = createApp({adminToken: token, loyaltyDemo: demo}); t.after(() => app.close());
  const url = '/api/demo/loyalty'; const headers = { authorization: `Bearer ${token}` };
  assert.equal((await app.inject(url + '/state')).statusCode, 401);
  assert.equal((await app.inject({url: url + '/state', headers})).json().mode, 'simulation');
  const post = (path: string, payload: unknown, language = 'es') => app.inject({ method:'POST', url:url + path, headers:{...headers, 'accept-language':language}, payload:payload as any });
  assert.equal((await post('/sales', {...sale('e1'), tenantId:'other'})).statusCode, 400);
  assert.equal((await post('/sales', {...sale('e1'), amountClp:5.5})).statusCode, 400);
  assert.equal((await post('/reset', {confirmation:'yes'})).statusCode, 400);
  assert.match((await post('/redemptions', {memberId:'demo-ana',rewardId:'coffee',requestId:'r1'})).json().error,/insuficiente/);
  assert.match((await post('/redemptions', {memberId:'demo-ana',rewardId:'coffee',requestId:'r1'},'en')).json().error,/Insufficient/);
  assert.equal((await post('/sales', sale('e1'))).statusCode, 200);
  assert.equal((await post('/sales', sale('e1'))).statusCode, 200);
  assert.equal((await post('/sales', sale('e1', 6000))).statusCode, 409);
  assert.equal((await post('/members', {name:'   ',requestId:'empty',loyaltyAccepted:true})).statusCode, 400);
  const member = (await post('/members', {name:'Test · Demo',requestId:'enroll1',loyaltyAccepted:true})).json();
  assert.equal((await post('/members', {name:'Test · Demo',requestId:'enroll1',loyaltyAccepted:true})).json().id, member.id);
  assert.equal((await post('/sales', sale('missing', 5000, 'unknown'))).statusCode, 409);
  const plain = createApp({adminToken: token}); t.after(() => plain.app.close());
  assert.equal((await plain.app.inject({url: url + '/state', headers})).statusCode, 404);
  assert.throws(() => createApp({repository:{} as any,loyaltyDemo:demo}), /isolated/);
});

test('reservation authorization expires, cancellation compensates once, and manual completion requires authorization/reason/reference', async () => {
  let time = Date.parse('2026-10-30T12:00:00Z');
  const demo = await LoyaltyDemo.open(undefined, () => time); await demo.sale(sale('paid', 10000));
  const reward = await demo.redeem('demo-ana', 'coffee', 'reserve');
  await assert.rejects(demo.use(reward.id, 'bad-token', 'wrong', 'Demo served', 'receipt'), {code:'invalid'});
  assert.throws(() => demo.use(reward.id, 'short', reward.authorization, 'no', 'receipt'), {code:'invalid'});
  time += 10 * 60_000;
  await assert.rejects(demo.use(reward.id, 'late', reward.authorization, 'Demo served', 'receipt'), {code:'expired'});
  await Promise.all([demo.cancel(reward.id,'cancel1','Expired reservation'),demo.cancel(reward.id,'cancel2','Expired reservation')]);
  const state = await demo.read(); assert.equal(state.members[0].balance, 10);
  assert.equal(state.ledger.filter(e => e.kind === 'cancel').length, 1);
  assert.equal(state.ledger.filter(e => e.kind === 'redeem').length, 1);
  const next = await demo.redeem('demo-ana','coffee','r2');
  await demo.use(next.id,'complete',next.authorization,'Customer collected demo reward','synthetic-receipt');
  await assert.rejects(demo.cancel(next.id,'cancel-used','Changed mind'),{code:'used'});
  assert.equal((await demo.read()).redemptions[1].completion?.transactionReference,'synthetic-receipt');
});

test('manual adjustments require reason and bearer authorization; enrollment separates loyalty acceptance from marketing; barcode revocable', async t => {
  const demo = await LoyaltyDemo.open(); const { app } = createApp({adminToken:token,loyaltyDemo:demo}); t.after(() => app.close());
  const payload={memberId:'demo-ana',delta:5,reason:'Demo service recovery',requestId:'adjust1'};
  const url='/api/demo/loyalty/adjustments';
  assert.equal((await app.inject({method:'POST',url,payload})).statusCode,401);
  const headers={authorization:`Bearer ${token}`};
  assert.equal((await app.inject({method:'POST',url,headers,payload:{...payload,reason:' '}})).statusCode,400);
  assert.equal((await app.inject({method:'POST',url,headers,payload:{...payload,delta:0}})).statusCode,400);
  await Promise.all([app.inject({method:'POST',url,headers,payload}),app.inject({method:'POST',url,headers,payload})]);
  let state=await demo.read(); assert.equal(state.members[0].balance,5); assert.equal(state.ledger[0].actor,'local-demo-owner');
  assert.equal(state.ledger[0].reason,payload.reason);
  assert.throws(()=>demo.enroll('Demo','no-consent',false),{code:'invalid'});
  const member=await demo.enroll('Demo','new-member',true); assert.equal(member.marketingConsent,false);
  const old=member.barcode; await demo.revokeBarcode(member.id,'revoke'); state=await demo.read();
  assert.notEqual(state.members.find(m=>m.id===member.id)?.barcode,old);
  assert.ok(!state.members.some(m=>m.barcode===old));
  assert.ok(!member.barcode.includes('Demo'));
});

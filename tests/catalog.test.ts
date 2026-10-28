import test from 'node:test';
import assert from 'node:assert/strict';
import { CatalogService, validateCatalogImport, withinHours } from '../apps/server/src/platform/catalog.ts';
import { MemoryStore } from '../apps/server/src/platform/domain.ts';
import { OrderingService } from '../apps/server/src/platform/ordering.ts';
import { DemoPaymentProvider, DemoPosProvider } from '../apps/server/src/integrations/contracts.ts';
import { Conversation } from '../apps/server/src/modules/whatsapp/conversation.ts';

function setup() {
  const state = new MemoryStore();
  let now = Date.now();
  state.now = () => now;
  const catalog = new CatalogService(state);
  const ordering = new OrderingService(state, new DemoPaymentProvider(), new DemoPosProvider());
  const chat = new Conversation(ordering);
  let sequence = 0;
  const send = (text: string) => chat.receive('customer', String(++sequence), text, 'en');
  const document = () => ({ expectedVersion: state.catalog.version, manualApproved: true as const,
    products: state.products.map(p => ({ ...p, mappings: { toteat: `t-${p.id}`, fudo: `f-${p.id}` } })), availability: structuredClone(state.availability) });
  return { state, catalog, ordering, send, document, advance: (ms: number) => { now += ms; } };
}

test('catalog import validates fields, duplicates, CLP integers, review and schedules before mutation', () => {
  const x = setup();
  for (const bad of [
    { ...x.document(), manualApproved: false },
    { ...x.document(), tenantId: 'other-restaurant' },
    { ...x.document(), products: [{ ...x.document().products[0], price: 1.5 }] },
    { ...x.document(), products: [x.document().products[0], x.document().products[0]] },
    { ...x.document(), availability: { ...x.state.availability, hours: [{ day: 2, opens: '25:00', closes: '26:00' }] } },
  ]) assert.throws(() => x.catalog.replace(bad));
  assert.equal(x.state.catalog.version, 1);
  validateCatalogImport(x.document());
  x.catalog.replace(x.document());
  assert.equal(x.state.catalog.version, 2);
  assert.equal(x.state.tenant.modules.qrMenu, false);
  assert.throws(() => x.catalog.replace({ ...x.document(), expectedVersion: 1 }), /Recarga|recarga/);
});

test('price or mapping changes require renewed confirmation and preserve the accepted quote snapshot', async () => {
  const x = setup();
  x.catalog.replace(x.document());
  await x.send('1 x 2');
  const changed = x.document();
  changed.products[0].price = 5000;
  changed.products[0].mappings.toteat = 't-replacement';
  x.catalog.replace(changed);
  assert.match(await x.send('confirm'), /changed or expired[\s\S]*10,000/);
  assert.equal(x.state.orders.size, 0);
  await x.send('confirm');
  const order = [...x.state.orders.values()][0];
  assert.equal(order.total, 10000);
  assert.equal(order.lines[0].providerProductId, 't-replacement');
  assert.equal(order.catalogVersion, 3);
  const later = x.document(); later.products[0].price = 6000; x.catalog.replace(later);
  await x.send('confirm');
  assert.equal(order.total, 10000);
  assert.equal(x.state.orders.size, 1);
});

test('quote expiry requires review, while unavailable items never reach checkout', async () => {
  const x = setup();
  await x.send('1');
  x.advance(5 * 60 * 1000);
  assert.match(await x.send('confirm'), /changed or expired/);
  assert.equal(x.state.orders.size, 0);
  x.catalog.stock('1', false, x.state.catalog.version);
  assert.match(await x.send('confirm'), /no longer available/);
  assert.equal(x.state.orders.size, 0);
});

test('arbitrary menu IDs and modifier mappings work for each POS; invalid selections do not mutate carts', async () => {
  for (const provider of ['toteat', 'fudo'] as const) {
    const x = setup(); x.state.tenant.posProvider = provider;
    const input = x.document();
    input.products = [{ id: '42', name: 'Hamburguesa', nameEn: 'Burger', price: 5500, available: true, mappings: { toteat: 't-burger', fudo: 'f-burger' },
      modifiers: [{ id: 'cheese', name: 'Queso', nameEn: 'Cheese', price: 500, available: true, mappings: { toteat: 't-cheese', fudo: 'f-cheese' } }] }];
    x.catalog.replace(input);
    assert.match(await x.send('42+unknown'), /Invalid product or extra/);
    assert.equal(x.state.session('customer').cart.size, 0);
    assert.match(await x.send('9999'), /no longer available/);
    await x.send('42+cheese x 2');
    await x.send('confirm');
    const order = [...x.state.orders.values()][0];
    assert.equal(order.total, 12000);
    assert.equal(order.lines[0].providerProductId, provider === 'toteat' ? 't-burger' : 'f-burger');
    assert.equal(order.lines[0].modifiers![0].providerId, provider === 'toteat' ? 't-cheese' : 'f-cheese');
  }
});

test('missing active-provider mappings fail closed, and removing items preserves historical catalog rows', async () => {
  const x = setup(); const input = x.document();
  input.products[0].mappings = { fudo: 'only-fudo' } as any;
  x.catalog.replace(input);
  assert.match(await x.send('1'), /missing its POS mapping/);
  assert.equal(x.state.session('customer').cart.size, 0);
  const smaller = x.document(); smaller.products = [smaller.products[1]]; x.catalog.replace(smaller);
  assert.equal(x.state.products.find(p => p.id === '1')?.available, false);
});

test('manual closure, closed shift, out-of-hours and stale review block confirmation and simulated payment', async () => {
  const x = setup(); await x.send('1');
  x.catalog.service(false, true, x.state.catalog.version);
  assert.match(await x.send('confirm'), /not accepting pickup/);
  x.catalog.service(true, false, x.state.catalog.version);
  assert.match(await x.send('confirm'), /not accepting pickup/);
  x.catalog.service(true, true, x.state.catalog.version);
  x.state.availability.hours = [{ day: (new Date().getUTCDay() + 3) % 7, opens: '01:00', closes: '02:00' }];
  assert.match(await x.send('confirm'), /not accepting pickup/);
  x.state.availability.hours = [];
  x.advance(24 * 60 * 60 * 1000);
  assert.match(await x.send('confirm'), /review the menu/);
  const reviewedAt = x.state.catalog.updatedAt;
  x.catalog.stock('1', true, x.state.catalog.version);
  assert.equal(x.state.catalog.updatedAt, reviewedAt);
  x.catalog.replace(x.document());
  await x.send('1'); await x.send('confirm');
  // The old session expired; the latest cart review is the only accepted total.
  if (!x.state.orders.size) await x.send('confirm');
  const order = [...x.state.orders.values()][0];
  x.catalog.service(false, false, x.state.catalog.version);
  await assert.rejects(x.ordering.simulatePayment(order.id), /retiro/);
  assert.equal(order.status, 'awaiting_payment');
});

test('service hours use local weekdays, closing boundaries, overnight rollover and Santiago DST', () => {
  const hours = [{ day: 0, opens: '22:00', closes: '02:00' }];
  assert.equal(withinHours(hours, 'UTC', Date.parse('2026-10-25T22:00:00Z')), true);
  assert.equal(withinHours(hours, 'UTC', Date.parse('2026-10-26T01:59:00Z')), true);
  assert.equal(withinHours(hours, 'UTC', Date.parse('2026-10-26T02:00:00Z')), false);
  const morning = [{ day: 3, opens: '09:00', closes: '10:00' }];
  assert.equal(withinHours(morning, 'America/Santiago', Date.parse('2026-07-15T13:00:00Z')), true);
  assert.equal(withinHours(morning, 'America/Santiago', Date.parse('2026-10-28T12:00:00Z')), true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createApp } from '../apps/server/src/app.ts';
import { parseMessages } from '../apps/server/src/integrations/whatsapp.ts';

const token = 'test-admin-token-at-least-16';
const headers = { authorization: `Bearer ${token}` };

test('pickup loop: no QR dependency, exact CLP total, payment before kitchen, collected metrics', async t => {
  const { app, store } = createApp({ adminToken: token });
  t.after(() => app.close());
  assert.equal(store.tenant.modules.qrMenu, false);
  const send = async (text: string, messageId = text) => {
    const response = await app.inject({ method: 'POST', url: '/api/demo/messages', headers, payload: { customerId: 'customer', messageId, text } });
    assert.equal(response.statusCode, 200);
    return response.json().reply as string;
  };
  assert.match(await send('hi'), /Completo italiano/);
  await send('1 x 2');
  await send('3');
  assert.match(await send('confirmar'), /11.500/);
  await send('confirmar', 'repeat-confirmation');
  assert.equal(store.orders.size, 1);
  const order = [...store.orders.values()][0];
  assert.equal(order.total, 11500);
  assert.equal(order.posReference, undefined);
  assert.equal(order.status, 'awaiting_payment');
  const invalid = await app.inject({ method: 'POST', url: `/api/demo/orders/${order.id}/status`, headers, payload: { status: 'ready' } });
  assert.equal(invalid.statusCode, 409);
  for (let i = 0; i < 2; i++) assert.equal((await app.inject({ method: 'POST', url: `/api/demo/orders/${order.id}/pay`, headers })).statusCode, 200);
  assert.equal(order.status, 'preparing');
  assert.match(order.posReference!, /^demo-kitchen-/);
  for (const status of ['ready', 'collected']) {
    assert.equal((await app.inject({ method: 'POST', url: `/api/demo/orders/${order.id}/status`, headers, payload: { status } })).statusCode, 200);
  }
  const dashboard = (await app.inject({ url: '/api/dashboard', headers })).json();
  assert.deepEqual(dashboard.metrics, { orders: 1, paidOrders: 1, collected: 1, paidRevenue: 11500 });
  assert.equal(dashboard.orders[0].customerId, undefined);
});

test('concurrent replay does not add twice; separate customers have separate carts', async () => {
  const { app, conversation, store } = createApp({ adminToken: token });
  await Promise.all([conversation.receive('a', 'same-id', '1 x 2'), conversation.receive('a', 'same-id', '1 x 2')]);
  assert.equal(store.session('a').cart.get('1'), 2);
  assert.equal(store.session('b').cart.size, 0);
  await app.close();
});

test('cart edits, quantity limits, empty checkout and unavailable products', async () => {
  const { app, conversation, store } = createApp({ adminToken: token });
  assert.match(await conversation.receive('a', 'empty', 'confirmar'), /vacío/);
  assert.equal(store.orders.size, 0);
  await conversation.receive('a', 'add', '2');
  assert.match(await conversation.receive('a', 'limit', '2 x 21'), /máximo/);
  assert.equal(store.session('a').cart.get('2'), 1);
  await conversation.receive('a', 'remove', 'quitar 2');
  assert.equal(store.session('a').cart.size, 0);
  await conversation.receive('a', 'add-again', '1');
  store.products[0].available = false;
  assert.match(await conversation.receive('a', 'sold-out', 'confirmar'), /disponible/);
  assert.equal(store.orders.size, 0);
  store.tenant.modules.whatsappOrdering = false;
  await assert.rejects(conversation.receive('a', 'disabled', 'hola'), /no disponibles/);
  await app.close();
});

test('dashboard/payment auth, input validation, secrets and malformed JSON', async t => {
  const { app } = createApp({ adminToken: token });
  t.after(() => app.close());
  for (const request of [{ url: '/api/dashboard' }, { method: 'POST' as const, url: '/api/demo/orders/missing/pay' }]) {
    assert.equal((await app.inject(request)).statusCode, 401);
  }
  const invalid = await app.inject({ method: 'POST', url: '/api/demo/messages', headers, payload: { text: '', customerId: 'a', total: 1 } });
  assert.equal(invalid.statusCode, 400);
  assert.equal((await app.inject({ method: 'POST', url: '/api/demo/messages', headers: { ...headers, 'content-type': 'application/json' }, payload: '{' })).statusCode, 400);
  const page = await app.inject('/');
  assert.equal(page.statusCode, 200);
  assert.ok(!page.body.includes(token));
});

test('signed Cloud API webhook, mapped phone, replay and retry after outbound failure', async t => {
  const sends: string[] = [];
  let fail = true;
  const { app, store } = createApp({
    adminToken: token, appSecret: 'secret', verifyToken: 'verify', phoneId: '123',
    transport: { sendText: async (_to, text) => { if (fail) { fail = false; throw new Error('transient provider failure'); } sends.push(text); } },
  });
  t.after(() => app.close());
  assert.equal((await app.inject('/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=42')).body, '42');
  assert.equal((await app.inject('/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=bad&hub.challenge=42')).statusCode, 403);
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '123' }, messages: [{ id: 'wamid.a', from: 'test-user', type: 'text', text: { body: '1 x 2' } }] } }] }] });
  const signature = 'sha256=' + createHmac('sha256', 'secret').update(body).digest('hex');
  const deliver = (signatureValue: string) => app.inject({ method: 'POST', url: '/webhooks/whatsapp', headers: { 'content-type': 'application/json', 'x-hub-signature-256': signatureValue }, payload: body });
  assert.equal((await deliver('bad')).statusCode, 401);
  assert.equal((await deliver(signature)).statusCode, 500);
  assert.equal((await deliver(signature)).statusCode, 200);
  assert.equal((await deliver(signature)).statusCode, 200);
  assert.equal(sends.length, 1);
  assert.equal(store.session('test-user').cart.get('1'), 2);
  assert.equal(parseMessages(JSON.parse(body), 'unmapped').length, 0);
  assert.deepEqual(parseMessages({ entry: 'not-an-array' }, '123'), []);
});

test('Spanish default, English selection and language changes preserve cart, order and CLP price', async t => {
  const { app, conversation, store } = createApp({ adminToken: token });
  t.after(() => app.close());
  assert.match(await conversation.receive('a', 'greeting', 'hi'), /Bienvenido/);
  assert.match(await conversation.receive('a', 'language', 'English'), /Beef empanada/);
  await conversation.receive('a', 'add', '1 x 2');
  assert.match(await conversation.receive('a', 'spanish', 'Español'), /Completo italiano/);
  assert.equal(store.session('a').cart.get('1'), 2);
  assert.match(await conversation.receive('a', 'cart', 'cart', 'en'), /Italian-style completo/);
  await conversation.receive('a', 'drink', '3');
  await conversation.receive('a', 'remove', 'remove 3');
  assert.equal(store.session('a').cart.has('3'), false);
  await conversation.receive('a', 'drink-again', '3');
  const confirmed = await conversation.receive('a', 'confirm', 'confirm');
  assert.match(confirmed, /SIMULATED payment/);
  assert.match(confirmed, /11,500/);
  await conversation.receive('a', 'confirm-spanish', 'confirmar', 'es');
  assert.equal(store.orders.size, 1);
  assert.equal([...store.orders.values()][0].total, 11500);
  const response = await app.inject({ url: '/api/dashboard', headers: { 'accept-language': 'en' } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, 'Enter the panel key to continue.');
  const empty = await conversation.receive('b', 'empty', 'confirm', 'en');
  assert.match(empty, /Your cart is empty/);
  const invalidLocale = await app.inject({ method: 'POST', url: '/api/demo/messages', headers, payload: { customerId: 'a', text: 'hola', locale: 'fr' } });
  assert.equal(invalidLocale.statusCode, 400);
});

test('both selectable demo POS providers snapshot routing and keep the same ordering contract', async () => {
  for (const provider of ['toteat', 'fudo'] as const) {
    const { app, store, conversation, ordering } = createApp({ adminToken: token, posProvider: provider });
    try {
      await conversation.receive('a', 'add', '2');
      await conversation.receive('a', 'confirm', 'confirmar');
      const order = [...store.orders.values()][0];
      assert.equal(order.posProvider, provider);
      // A later account setting change must not redirect this existing order.
      store.tenant.posProvider = provider === 'toteat' ? 'fudo' : 'toteat';
      await ordering.simulatePayment(order.id);
      await ordering.simulatePayment(order.id);
      assert.equal(order.posReference, `demo-kitchen-${provider}-${order.id}`);
      assert.equal(order.total, 3200);
    } finally { await app.close(); }
  }
});

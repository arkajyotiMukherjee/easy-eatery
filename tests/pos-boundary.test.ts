import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore, type Order } from '../apps/server/src/platform/domain.ts';
import { OrderingService } from '../apps/server/src/platform/ordering.ts';
import { DemoPaymentProvider, type PosProvider } from '../apps/server/src/integrations/contracts.ts';

// These exercise the shared port with synthetic implementations. They do not
// describe Toteat/Fudo request formats or claim vendor acceptance/idempotency.
async function confirmed(provider: 'toteat' | 'fudo', pos: PosProvider) {
  const state = new MemoryStore();
  state.tenant.posProvider = provider;
  const service = new OrderingService(state, new DemoPaymentProvider(), pos);
  const cart = state.session('synthetic-customer').cart;
  cart.set('1', 2);
  cart.set('3', 1);
  state.review('synthetic-customer');
  return { state, service, order: await service.confirm('synthetic-customer') };
}

test('synthetic POS boundary receives detached immutable-price order and only one successful submission', async () => {
  for (const provider of ['toteat', 'fudo'] as const) {
    const submitted: Order[] = [];
    const pos: PosProvider = { submitPaidPickup: async order => {
      submitted.push(structuredClone(order));
      // An external connector must not gain a mutable reference to domain state.
      order.total = 1;
      order.lines[0].unitPrice = 1;
      order.lines.length = 0;
      order.posProvider = provider === 'toteat' ? 'fudo' : 'toteat';
      order.paymentState = 'due';
      return { reference: `synthetic-accepted-${provider}` };
    } };
    const { state, service, order } = await confirmed(provider, pos);
    const originalLines = structuredClone(order.lines);
    state.tenant.posProvider = provider === 'toteat' ? 'fudo' : 'toteat';
    await service.simulatePayment(order.id);
    await service.simulatePayment(order.id);
    assert.equal(submitted.length, 1);
    assert.equal(submitted[0].posProvider, provider);
    assert.equal(submitted[0].total, 11500);
    assert.equal(submitted[0].paymentState, 'simulated_paid');
    assert.equal(order.total, 11500);
    assert.deepEqual(order.lines, originalLines);
    assert.equal(order.posProvider, provider);
    assert.equal(order.paymentState, 'simulated_paid');
    assert.equal(order.posReference, `synthetic-accepted-${provider}`);
    assert.equal(order.status, 'preparing');
  }
});

test('synthetic POS exception propagates without inventing kitchen acceptance or undoing recorded demo payment', async () => {
  for (const provider of ['toteat', 'fudo'] as const) {
    const failure = new Error('Synthetic connector failure; no vendor classification asserted.');
    let submissions = 0;
    const { service, order } = await confirmed(provider, { submitPaidPickup: async () => { submissions++; throw failure; } });
    await assert.rejects(service.simulatePayment(order.id), error => error === failure);
    assert.equal(submissions, 1);
    assert.equal(order.paymentState, 'simulated_paid');
    assert.equal(order.status, 'paid');
    assert.equal(order.posReference, undefined);
    assert.throws(() => service.transition(order.id, 'ready'));
    // Deliberately do not retry an unclassified outcome: the current port has
    // no vendor reconciliation/idempotency contract, so this test claims none.
  }
});

test('local pay-at-pickup fulfillment never invokes the synthetic POS port', async () => {
  const state = new MemoryStore();
  state.tenant.payAtPickup = true;
  const service = new OrderingService(state, new DemoPaymentProvider(), {
    submitPaidPickup: async () => { assert.fail('Local fulfillment must not contact a POS connector.'); },
  });
  state.session('synthetic-local').cart.set('1', 1);
  state.review('synthetic-local');
  const order = await service.confirm('synthetic-local');
  await assert.rejects(service.simulatePayment(order.id));
  service.acceptPickup(order.id);
  service.transition(order.id, 'ready');
  service.recordStorePayment(order.id);
  service.transition(order.id, 'collected');
  assert.equal(order.posReference, undefined);
  assert.equal(order.paymentState, 'store_paid');
});

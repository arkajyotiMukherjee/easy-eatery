import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { WebpaySandbox, WebpaySandboxError, type SandboxAttempt } from '../apps/server/src/integrations/webpay.ts';

const expected = { buyOrder: 'synthetic-order', sessionId: 'synthetic-session', amount: 4500, currency: 'CLP' as const };
const checkout = 'https://webpay3gint.transbank.cl/webpayserver/initTransaction';
const attempt: SandboxAttempt = { ...expected, token: 'synthetic-token', environment: 'integration' };
const authorized = { buy_order: expected.buyOrder, session_id: expected.sessionId, amount: 4500, status: 'AUTHORIZED', response_code: 0, card_detail: { card_number: 'fixture-only' } };
const configuration = { commerceCode: '123456789012', apiKey: 'synthetic-not-a-real-key', returnUrl: 'https://example.test/payment/return' };

test('Webpay sandbox mock HTTP contract uses POST handoff and server-side commit/status without returning card data', async t => {
  const requests: { method?: string; url?: string; body: unknown }[] = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const raw = Buffer.concat(chunks).toString();
    requests.push({ method: req.method, url: req.url, body: raw ? JSON.parse(raw) : undefined });
    assert.equal(req.headers['tbk-api-key-id'], configuration.commerceCode);
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(req.method === 'POST' ? { token: attempt.token, url: checkout } : authorized));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const gateway = new WebpaySandbox({ ...configuration, fetcher: async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://webpay3gint.transbank.cl');
    assert.equal(init?.redirect, 'error');
    return fetch(`http://127.0.0.1:${address.port}${url.pathname}`, init);
  } });
  const created = await gateway.create(expected);
  assert.deepEqual(created.handoff, { method: 'POST', url: checkout, field: 'token_ws' });
  assert.ok(Object.isFrozen(created.attempt));
  assert.equal((await gateway.commit(created.attempt)).testAuthorized, true);
  assert.deepEqual(await gateway.status(created.attempt), { environment: 'integration', status: 'AUTHORIZED', responseCode: 0, testAuthorized: true });
  assert.deepEqual(requests.map(r => r.method), ['POST', 'PUT', 'GET']);
  assert.deepEqual(requests[0].body, { buy_order: expected.buyOrder, session_id: expected.sessionId, amount: expected.amount, return_url: configuration.returnUrl });
  assert.equal(requests[1].url, '/rswebpaytransaction/api/webpay/v1.2/transactions/synthetic-token');
});

test('Webpay sandbox rejects mismatched authoritative totals/order/session and malformed authorization', async () => {
  for (const patch of [{ amount: 4501 }, { amount: '4500' }, { buy_order: 'another-order' }, { session_id: 'another-session' }, { response_code: -1 }, { response_code: undefined }, { status: 'unexpected' }]) {
    const gateway = new WebpaySandbox({ ...configuration, fetcher: async () => Response.json({ ...authorized, ...patch }) });
    await assert.rejects(gateway.commit(attempt), e => e instanceof WebpaySandboxError && e.outcome === 'invalid_response');
  }
});

test('Webpay sandbox decline/cancel/expiry/reversal observations never authorize; repeated status has no fulfillment side effects', async () => {
  for (const status of ['INITIALIZED', 'FAILED', 'REVERSED', 'NULLIFIED', 'PARTIALLY_NULLIFIED', 'CAPTURED']) {
    const gateway = new WebpaySandbox({ ...configuration, fetcher: async () => Response.json({ ...authorized, status, response_code: status === 'FAILED' ? -1 : 0 }) });
    assert.equal((await gateway.status(attempt)).testAuthorized, false);
    assert.equal((await gateway.status(attempt)).testAuthorized, false);
  }
});

test('Webpay sandbox does not retry ambiguous failures or leak gateway content/tokens', async () => {
  for (const fetcher of [async () => { throw new Error('private-token-and-key'); }, async () => new Response('private-token-and-key', { status: 403 }), async () => new Response('private-token-and-key')]) {
    let calls = 0;
    const gateway = new WebpaySandbox({ ...configuration, fetcher: async () => { calls++; return fetcher(); } });
    await assert.rejects(gateway.commit(attempt), e => e instanceof WebpaySandboxError && !e.message.includes('private-token-and-key') && ['unknown', 'invalid_response'].includes(e.outcome));
    assert.equal(calls, 1);
  }
});

test('Webpay sandbox blocks hostile handoff URLs and invalid input before network I/O', async () => {
  for (const url of ['https://webpay3g.transbank.cl/webpayserver/initTransaction', 'https://example.test/', checkout + '?token=leak', 'http://webpay3gint.transbank.cl/webpayserver/initTransaction']) {
    const gateway = new WebpaySandbox({ ...configuration, fetcher: async () => Response.json({ token: attempt.token, url }) });
    await assert.rejects(gateway.create(expected), WebpaySandboxError);
  }
  let calls = 0;
  const gateway = new WebpaySandbox({ ...configuration, fetcher: async () => { calls++; return Response.json({}); } });
  for (const patch of [{ amount: -1 }, { amount: 1.5 }, { buyOrder: 'a'.repeat(27) }, { sessionId: '' }, { currency: 'USD' }]) {
    await assert.rejects(gateway.create({ ...expected, ...patch } as typeof expected), TypeError);
  }
  await assert.rejects(gateway.commit({ ...attempt, token: '../another-token' }), TypeError);
  assert.equal(calls, 0);
  assert.throws(() => new WebpaySandbox({ ...configuration, returnUrl: 'http://example.test/return' }), TypeError);
});

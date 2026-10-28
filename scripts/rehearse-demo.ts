import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

// This rehearsal owns fresh memory-only processes. It never targets a supplied URL,
// database or provider account, and does not expose its ephemeral panel credentials.
if (process.argv.length > 2) throw new Error('No arguments supported: this rehearsal only starts isolated local demos.');
const root = fileURLToPath(new URL('../', import.meta.url));

async function freePort() {
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const address = socket.address();
  assert.ok(address && typeof address === 'object');
  await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
  return address.port;
}

async function rehearse(provider: 'toteat' | 'fudo', local: boolean) {
  const port = await freePort();
  const token = randomBytes(24).toString('hex');
  const child = spawn(process.execPath, ['--import', 'tsx', '--env-file-if-exists=.env', 'apps/server/src/index.ts'], {
    cwd: root,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), ADMIN_TOKEN: token,
      PERSISTENCE: 'memory', WHATSAPP_TRANSPORT: 'console', POS_PROVIDER: provider, PAY_AT_PICKUP: String(local) },
    stdio: 'ignore',
  });
  let spawnError: Error | undefined;
  child.on('error', error => { spawnError = error; });
  const exited = new Promise<void>(resolve => child.once('close', () => resolve()));
  const base = `http://127.0.0.1:${port}`;
  const request = (path: string, body?: unknown, auth = true) => fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(3000),
    headers: { ...(auth ? { authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = async (path: string, body?: unknown, expected = 200) => {
    const response = await request(path, body);
    assert.equal(response.status, expected, `Unexpected response for ${path}`);
    return response.json();
  };
  try {
    let healthy = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null || child.signalCode !== null) throw new Error('Demo exited before readiness.');
      try {
        const response = await request('/health', undefined, false);
        if (response.ok) {
          const health = await response.json();
          assert.equal(health.persistence, 'memory');
          assert.equal(health.payments, local ? 'pay_at_pickup' : 'simulated');
          healthy = true;
          break;
        }
      } catch { /* Startup may not have bound its socket yet. */ }
      await delay(100);
    }
    assert.ok(healthy, 'Demo did not become ready within the startup deadline.');
    assert.equal((await request('/api/dashboard', undefined, false)).status, 401);
    const page = await request('/', undefined, false);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /<html lang="es-CL">/);
    assert.match(html, /value="en"/);
    assert.ok(!html.includes(token));
    for (const asset of ['/app.js', '/i18n.js', '/catalog-ui.js', '/style.css']) {
      assert.equal((await request(asset, undefined, false)).status, 200);
    }

    for (const locale of ['es', 'en'] as const) {
      const customerId = `synthetic-rehearsal-${locale}`;
      let message = 0;
      const send = (text: string, messageId = `${locale}-${message++}`) => json('/api/demo/messages', { customerId, messageId, text, locale });
      const greeting = await send(locale === 'es' ? 'hola' : 'hello');
      assert.match(greeting.reply, locale === 'es' ? /Completo italiano/ : /Italian-style completo/);
      await send('1 x 2', `${locale}-replay`);
      await send('1 x 2', `${locale}-replay`);
      await send('3');
      const confirmation = await send(locale === 'es' ? 'confirmar' : 'confirm');
      assert.match(confirmation.reply, /11[.,]500/);
      await send(locale === 'es' ? 'confirmar' : 'confirm');
      const dashboard = await json('/api/dashboard');
      assert.equal(dashboard.orders.length, locale === 'es' ? 1 : 2);
      const order = dashboard.orders.find((item: { status: string }) => item.status === 'awaiting_payment');
      assert.ok(order);
      assert.equal(order.total, 11500);
      assert.equal(order.customerId, undefined);
      const status = (value: string, expected = 200) => json(`/api/demo/orders/${order.id}/status`, { status: value }, expected);
      await status('ready', 409);
      if (local) {
        assert.equal(order.paymentReference, undefined);
        assert.equal(order.posReference, undefined);
        await json(`/api/pickup/orders/${order.id}/record-store-payment`, {}, 409);
        await json(`/api/demo/orders/${order.id}/pay`, {}, 409);
        await json(`/api/pickup/orders/${order.id}/accept`, {});
        await json(`/api/pickup/orders/${order.id}/accept`, {});
        await status('ready');
        await status('collected', 409);
        await json(`/api/pickup/orders/${order.id}/record-store-payment`, {});
        await json(`/api/pickup/orders/${order.id}/record-store-payment`, {});
      } else {
        await json(`/api/demo/orders/${order.id}/pay`, {});
        await json(`/api/demo/orders/${order.id}/pay`, {});
        await status('ready');
      }
      await status('collected');
      const completed = await json('/api/dashboard');
      const count = locale === 'es' ? 1 : 2;
      assert.equal(completed.metrics.collected, count);
      assert.equal(completed.metrics.paidRevenue, count * 11500);
      assert.equal(completed.metrics.storePaidRevenue, local ? count * 11500 : 0);
      assert.equal(completed.metrics.dueRevenue, 0);
      assert.ok(completed.orders.every((item: { status: string }) => item.status === 'collected'));
    }
    console.log(`PASS ${local ? 'local pay at pickup' : `simulated ${provider}`} — ES/EN HTTP ordering, replay, auth, state gates and CLP totals`);
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    await Promise.race([exited, delay(5000)]);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await exited;
    }
  }
}

await rehearse('toteat', true);
await rehearse('toteat', false);
await rehearse('fudo', false);
console.log('Local rehearsal complete. No real messages, payments or POS submissions were made. Browser interaction and PostgreSQL recovery need separate checks.');

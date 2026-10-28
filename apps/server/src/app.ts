import Fastify, { type FastifyRequest } from 'fastify';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { DomainError, MemoryStore, type OrderStatus } from './platform/domain.ts';
import { OrderingService } from './platform/ordering.ts';
import { Conversation } from './modules/whatsapp/conversation.ts';
import { DemoPaymentProvider, DemoPosProvider, type WhatsAppTransport } from './integrations/contracts.ts';
import { parseMessages, validSignature } from './integrations/whatsapp.ts';
import { errors, localeFrom, type Locale } from './platform/i18n.ts';
import { AccessError, type Identity, type PostgresRepository } from './persistence/database.ts';

export type Config = { adminToken?: string; repository?: PostgresRepository; verifyToken?: string; appSecret?: string; phoneId?: string; transport?: WhatsAppTransport; posProvider?: 'toteat' | 'fudo' };

export function createApp(config: Config, store = new MemoryStore()) {
  if (!config.repository && (!config.adminToken || config.adminToken.length < 16)) throw new Error('ADMIN_TOKEN must contain at least 16 characters.');
  if (config.posProvider) store.tenant.posProvider = config.posProvider;
  const app = Fastify({ bodyLimit: 128 * 1024, logger: false, ajv: { customOptions: { removeAdditional: false } } });
  const ordering = new OrderingService(store, new DemoPaymentProvider(), new DemoPosProvider());
  const conversation = new Conversation(ordering);
  const identities = new WeakMap<FastifyRequest, Identity>();
  type Services = { state: MemoryStore; orders: OrderingService; chat: Conversation };
  const services = (state: MemoryStore): Services => {
    if (state === store) return { state, orders: ordering, chat: conversation };
    const orders = new OrderingService(state, new DemoPaymentProvider(), new DemoPosProvider());
    return { state, orders, chat: new Conversation(orders) };
  };
  async function run<T>(identity: Identity | undefined, action: string, work: (services: Services) => Promise<T> | T): Promise<T> {
    if (config.repository) {
      if (!identity) throw new AccessError();
      return config.repository.transaction(identity, action, state => work(services(state)));
    }
    return work(services(store));
  }
  // Test-account demo only. Durable queue, retry policy and distributed locks are M2.
  let webhookQueue = Promise.resolve();
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    (request as any).rawBody = body;
    try { done(null, JSON.parse(body as string)); }
    catch { done(Object.assign(new Error('Invalid JSON'), { statusCode: 400 }), undefined); }
  });
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if (request.url.startsWith('/api/')) {
      if (config.repository) {
        const authorization = request.headers.authorization ?? '';
        const identity = authorization.startsWith('Bearer ') ? await config.repository.authenticate(authorization.slice(7)) : null;
        if (!identity) return reply.code(401).send({ error: errors[localeFrom(request.headers['accept-language'])].unauthorized });
        identities.set(request, identity);
        return;
      }
      const supplied = Buffer.from(request.headers.authorization ?? '');
      const expected = Buffer.from(`Bearer ${config.adminToken}`);
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
        return reply.code(401).send({ error: errors[localeFrom(request.headers['accept-language'])].unauthorized });
      }
    }
  });
  app.setErrorHandler((error, request, reply) => {
    const status = error instanceof DomainError ? 409 : (error as any).statusCode ?? 500;
    const locale = localeFrom(request.headers['accept-language']);
    reply.code(status).send({ error: error instanceof DomainError ? errors[locale][error.code] : errors[locale][status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : status >= 500 ? 'internal' : 'invalid_request'] });
  });

  const assets = new Map([['/', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/i18n.js', ['i18n.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']]]);
  for (const [route, [file, type]] of assets) {
    app.get(route, async (_request, reply) => reply.type(type).send(await readFile(new URL(`../public/${file}`, import.meta.url), 'utf8')));
  }
  app.get('/health', async () => {
    if (config.repository) await config.repository.pool.query('SELECT 1');
    return { status: 'ok', persistence: config.repository ? 'postgres' : 'memory', pos: 'simulated', payments: 'simulated' };
  });
  app.get('/api/dashboard', async request => run(identities.get(request), 'dashboard.read', ({ orders }) => ({ ...orders.dashboard(), persistence: config.repository ? 'postgres' : 'memory', role: identities.get(request)?.role ?? 'owner' })));
  app.post<{ Body: { text: string; customerId: string; messageId?: string; locale?: Locale } }>('/api/demo/messages', {
    schema: { body: { type: 'object', required: ['text', 'customerId'], additionalProperties: false, properties: {
      text: { type: 'string', minLength: 1, maxLength: 1000 },
      customerId: { type: 'string', minLength: 1, maxLength: 80 },
      messageId: { type: 'string', minLength: 1, maxLength: 100 },
      locale: { type: 'string', enum: ['es', 'en'] },
    } } },
  }, async request => run(identities.get(request), 'demo.message', async ({ chat }) => ({ reply: await chat.receive(request.body.customerId, request.body.messageId ?? randomBytes(16).toString('hex'), request.body.text, request.body.locale) })));

  app.post<{ Params: { id: string } }>('/api/demo/orders/:id/pay', {
    schema: { params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] } },
  }, async request => run(identities.get(request), 'demo.payment', ({ orders }) => orders.simulatePayment(request.params.id)));
  app.post<{ Params: { id: string }; Body: { status: OrderStatus } }>('/api/demo/orders/:id/status', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      body: { type: 'object', required: ['status'], additionalProperties: false, properties: { status: { enum: ['ready', 'collected'] } } },
    },
  }, async request => run(identities.get(request), 'demo.status', ({ orders }) => orders.transition(request.params.id, request.body.status)));

  app.get<{ Querystring: Record<string, string> }>('/webhooks/whatsapp', async (request, reply) => {
    const query = request.query;
    if (!config.verifyToken || query['hub.mode'] !== 'subscribe' || query['hub.verify_token'] !== config.verifyToken || !query['hub.challenge']) {
      return reply.code(403).send({ error: 'Verification failed' });
    }
    return reply.type('text/plain').send(query['hub.challenge']);
  });
  app.post('/webhooks/whatsapp', async (request, reply) => {
    if (!config.transport || !config.phoneId || !config.appSecret) return reply.code(503).send({ error: 'Cloud transport not configured' });
    const signature = request.headers['x-hub-signature-256'];
    if (!validSignature((request as any).rawBody ?? '', typeof signature === 'string' ? signature : undefined, config.appSecret)) {
      return reply.code(401).send({ error: 'Invalid signature' });
    }
    const messages = parseMessages(request.body, config.phoneId);
    const identity = config.repository ? await config.repository.channelIdentity(config.phoneId) : undefined;
    if (config.repository && !identity) return reply.code(403).send({ error: 'Unmapped receiving account' });
    const run = webhookQueue.then(async () => {
      for (const message of messages) {
        await deliverMessage(identity ?? undefined, message);
      }
    });
    webhookQueue = run.catch(() => {});
    // Synchronous delivery is intentional for this scaffold: failed sends receive 5xx,
    // allowing Meta retry. M2 must acknowledge a durable inbox before processing.
    await run;
    return { received: true };
  });
  async function deliverMessage(identity: Identity | undefined, message: { from: string; id: string; text: string }) {
    const result = await run(identity, 'whatsapp.receive', async ({ state, chat }) => {
      const key = `${state.tenant.id}:${message.from}:${message.id}`;
      if (state.delivered.has(key)) return { key, response: undefined };
      return { key, response: await chat.receive(message.from, message.id, message.text) };
    });
    if (result.response === undefined) return;
    // Network sends are outside the DB transaction. Crash/timeout ambiguity and
    // distributed delivery claims remain issue #10, not a financial guarantee.
    await config.transport!.sendText(message.from, result.response);
    await run(identity, 'whatsapp.delivered', ({ state }) => { state.delivered.add(result.key); });
  }
  return { app, store, ordering, conversation };
}

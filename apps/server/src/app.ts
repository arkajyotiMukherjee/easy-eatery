import Fastify from 'fastify';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { DomainError, MemoryStore, type OrderStatus } from './platform/domain.ts';
import { OrderingService } from './platform/ordering.ts';
import { Conversation } from './modules/whatsapp/conversation.ts';
import { DemoPaymentProvider, DemoPosProvider, type WhatsAppTransport } from './integrations/contracts.ts';
import { parseMessages, validSignature } from './integrations/whatsapp.ts';
import { errors, localeFrom, type Locale } from './platform/i18n.ts';

export type Config = { adminToken: string; verifyToken?: string; appSecret?: string; phoneId?: string; transport?: WhatsAppTransport; posProvider?: 'toteat' | 'fudo' };

export function createApp(config: Config, store = new MemoryStore()) {
  if (config.adminToken.length < 16) throw new Error('ADMIN_TOKEN must contain at least 16 characters.');
  if (config.posProvider) store.tenant.posProvider = config.posProvider;
  const app = Fastify({ bodyLimit: 128 * 1024, logger: false });
  const ordering = new OrderingService(store, new DemoPaymentProvider(), new DemoPosProvider());
  const conversation = new Conversation(ordering);
  const delivered = new Set<string>();
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
    reply.code(status).send({ error: error instanceof DomainError ? errors[locale][error.code] : errors[locale][status >= 500 ? 'internal' : 'invalid_request'] });
  });

  const assets = new Map([['/', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/i18n.js', ['i18n.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']]]);
  for (const [route, [file, type]] of assets) {
    app.get(route, async (_request, reply) => reply.type(type).send(await readFile(new URL(`../public/${file}`, import.meta.url), 'utf8')));
  }
  app.get('/health', async () => ({ status: 'ok', persistence: 'memory', pos: 'simulated', payments: 'simulated' }));
  app.get('/api/dashboard', async () => ordering.dashboard());
  app.post<{ Body: { text: string; customerId: string; messageId?: string; locale?: Locale } }>('/api/demo/messages', {
    schema: { body: { type: 'object', required: ['text', 'customerId'], additionalProperties: false, properties: {
      text: { type: 'string', minLength: 1, maxLength: 1000 },
      customerId: { type: 'string', minLength: 1, maxLength: 80 },
      messageId: { type: 'string', minLength: 1, maxLength: 100 },
      locale: { type: 'string', enum: ['es', 'en'] },
    } } },
  }, async request => ({ reply: await conversation.receive(request.body.customerId, request.body.messageId ?? randomBytes(16).toString('hex'), request.body.text, request.body.locale) }));

  app.post<{ Params: { id: string } }>('/api/demo/orders/:id/pay', async request => ordering.simulatePayment(request.params.id));
  app.post<{ Params: { id: string }; Body: { status: OrderStatus } }>('/api/demo/orders/:id/status', {
    schema: { body: { type: 'object', required: ['status'], additionalProperties: false, properties: { status: { enum: ['ready', 'collected'] } } } },
  }, async request => ordering.transition(request.params.id, request.body.status));

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
    const run = webhookQueue.then(async () => {
      for (const message of messages) {
        const key = `${config.phoneId}:${message.from}:${message.id}`;
        if (delivered.has(key)) continue;
        const response = await conversation.receive(message.from, message.id, message.text);
        await config.transport!.sendText(message.from, response);
        delivered.add(key);
      }
    });
    webhookQueue = run.catch(() => {});
    // Synchronous delivery is intentional for this scaffold: failed sends receive 5xx,
    // allowing Meta retry. M2 must acknowledge a durable inbox before processing.
    await run;
    return { received: true };
  });
  return { app, store, ordering, conversation };
}

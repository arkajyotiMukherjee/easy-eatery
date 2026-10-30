import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Identity } from './persistence/database.ts';
import type { SandboxPayments } from './persistence/sandbox-payments.ts';

const unavailable = () => Object.assign(new Error('Sandbox checkout is not enabled.'), { statusCode: 409 });
const idParams = { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } };
const emptyBody = { type: 'object', additionalProperties: false, maxProperties: 0 };
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const html = (body: string) => `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Webpay sandbox · Easy Eatery</title><body><main>${body}</main></body></html>`;

export function registerSandboxRoutes(app: FastifyInstance, payments: SandboxPayments | undefined, identity: (request: FastifyRequest) => Identity | undefined) {
  app.get('/api/sandbox/attempts', async request => payments ? payments.list(identity(request)!) : { attempts: [], limit: 100, enabled: false });
  app.post<{ Params: { id: string } }>('/api/sandbox/orders/:id/checkout', { schema: { params: idParams, body: emptyBody } }, async request => {
    if (!payments) throw unavailable();
    return payments.create(identity(request)!, request.params.id);
  });
  app.post<{ Params: { id: string } }>('/api/sandbox/attempts/:id/reconcile', { schema: { params: idParams, body: emptyBody } }, async request => {
    if (!payments) throw unavailable();
    return payments.reconcile(identity(request)!, request.params.id);
  });
  app.post<{ Params:{id:string}; Body:{expectedVersion:number;confirmation:string} }>('/api/sandbox/attempts/:id/reverse', { schema:{params:idParams,body:{type:'object',additionalProperties:false,required:['expectedVersion','confirmation'],properties:{expectedVersion:{type:'integer',minimum:0},confirmation:{const:'reverse_sandbox_test_authorization'}}}} },async request=>{
    if (!payments) throw unavailable();
    return payments.reverse(identity(request)!,request.params.id,request.body.expectedVersion);
  });
  app.get<{ Params: { link: string } }>('/sandbox/checkout/:link', async (request, reply) => {
    if (!payments) throw unavailable();
    const handoff = await payments.handoff(request.params.link);
    reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action https://webpay3gint.transbank.cl");
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('X-Robots-Tag', 'noindex, nofollow');
    return reply.type('text/html').send(html(`<h1>Pago de prueba / Test checkout</h1><p>CLP ${handoff.amount}. Solo sandbox: no se recibe dinero real. / Sandbox only: no real money is received.</p><form method="post" action="https://webpay3gint.transbank.cl/webpayserver/initTransaction"><input type="hidden" name="token_ws" value="${escape(handoff.token)}"><button type="submit">Continuar a Webpay de prueba / Continue to Webpay sandbox</button></form>`));
  });
  // Gateway forms contain no card fields. Reject duplicate names rather than accepting
  // an ambiguous token. Browser cancellation/expiry parameters are never authority.
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_request, body, done) => {
    const params = new URLSearchParams(body as string);
    const parsed: Record<string,string> = Object.create(null);
    for (const [key,value] of params) {
      if (Object.hasOwn(parsed,key)) return done(Object.assign(new Error('Duplicate form field.'), { statusCode: 400 }), undefined);
      parsed[key] = value;
    }
    done(null,parsed);
  });
  app.post<{ Body: Record<string,string> }>('/sandbox/return', async (request, reply) => {
    if (!payments) throw unavailable();
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.values(body).some(value=>typeof value!=='string'||value.length>256) || Object.keys(body).some(key => !['token_ws','TBK_TOKEN','TBK_ORDEN_COMPRA','TBK_ID_SESION'].includes(key)) || (!!body.token_ws === !!body.TBK_TOKEN)) throw Object.assign(new Error('Invalid gateway return.'), { statusCode: 400 });
    const result = await payments.returned(body.token_ws ?? body.TBK_TOKEN, !!body.TBK_TOKEN);
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('X-Robots-Tag', 'noindex, nofollow');
    const authorized = result.state === 'authorized';
    return reply.type('text/html').send(html(authorized ? '<h1>Autorización de prueba confirmada / Test authorization confirmed</h1><p>La cocina local recibió un solo pedido. No se recibió dinero real. / The local kitchen received one ticket. No real money was received.</p>' : '<h1>Revisión del pago de prueba / Test payment review</h1><p>El regreso del navegador no confirma el pago. Solicita revisión del personal; no inicies otro pago. / A browser return does not confirm payment. Ask staff to review; do not start another payment.</p>'));
  });
}

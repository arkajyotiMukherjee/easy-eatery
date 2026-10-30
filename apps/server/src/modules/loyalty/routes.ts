import type { FastifyInstance } from 'fastify';
import { localeFrom } from '../../platform/i18n.ts';
import { LoyaltyDemo, LoyaltyError } from './service.ts';

const messages = {
  es: { expired: 'La autorización de canje venció. Cancela la reserva para recuperar los tokens.', missing: 'Cliente, compra o recompensa no encontrado.', conflict: 'La solicitud ya existe con otros datos o el programa cambió. Actualiza el panel.', balance: 'Saldo de tokens insuficiente.', used: 'Esta recompensa ya fue utilizada.', wallet: 'Wallet simulado no disponible. El saldo local está guardado; vuelve a sincronizar después.', invalid: 'Revisa los datos de la solicitud.' },
  en: { expired: 'Redemption authorization expired. Cancel the reservation to restore tokens.', missing: 'Member, purchase or reward not found.', conflict: 'This request already exists with different data, or the program changed. Refresh the panel.', balance: 'Insufficient token balance.', used: 'This reward has already been used.', wallet: 'Simulated Wallet unavailable. The local balance is saved; synchronize again later.', invalid: 'Check the request details.' },
};
const id = { type: 'string', pattern: '^[A-Za-z0-9_-]{1,100}$' };
const body = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, properties, required });

/** Registered only in the explicitly enabled single-restaurant local demo, under existing bearer auth. */
export function registerLoyaltyRoutes(app: FastifyInstance, demo: LoyaltyDemo) {
  app.register(async routes => {
    routes.setErrorHandler((error, request, reply) => {
      if (error instanceof LoyaltyError) return reply.code(error.code === 'wallet' ? 503 : error.code === 'invalid' ? 400 : 409).send({ error: messages[localeFrom(request.headers['accept-language'])][error.code] });
      throw error;
    });
    routes.get('/state', () => demo.read());
    routes.post<{ Body: { name: string; requestId: string; loyaltyAccepted: boolean } }>('/members', { schema: { body: body({ name: { type: 'string', minLength: 1, maxLength: 60 }, requestId: id, loyaltyAccepted: { const: true } }) } }, request => demo.enroll(request.body.name, request.body.requestId, request.body.loyaltyAccepted));
    routes.post<{ Body: { memberId: string; amountClp: number; eventId: string; channel: 'pickup' | 'dine_in' } }>('/sales', {
      schema: { body: body({ memberId: id, amountClp: { type: 'integer', minimum: 1, maximum: 10_000_000 }, eventId: id, channel: { enum: ['pickup', 'dine_in'] } }) },
    }, request => demo.sale(request.body));
    routes.post<{ Body: { memberId: string; rewardId: string; requestId: string } }>('/redemptions', { schema: { body: body({ memberId: id, rewardId: id, requestId: id }) } }, request => demo.redeem(request.body.memberId, request.body.rewardId, request.body.requestId));
    const actionSchema = { params: body({ id }), body: body({ requestId: id }) };
    const reason = { type: 'string', minLength: 5, maxLength: 200 };
    routes.post<{ Params: { id: string }; Body: { requestId: string; authorization: string; reason: string; transactionReference: string } }>('/redemptions/:id/use', { schema: { params: body({ id }), body: body({ requestId: id, authorization: id, reason, transactionReference: id }) } }, request => demo.use(request.params.id, request.body.requestId, request.body.authorization, request.body.reason, request.body.transactionReference));
    routes.post<{ Params: { id: string }; Body: { requestId: string; reason: string } }>('/redemptions/:id/cancel', { schema: { params: body({ id }), body: body({ requestId: id, reason }) } }, request => demo.cancel(request.params.id, request.body.requestId, request.body.reason));
    routes.post<{ Body: { memberId: string; delta: number; reason: string; requestId: string } }>('/adjustments', { schema: { body: body({ memberId: id, delta: { type: 'integer', minimum: -1000, maximum: 1000, not: { const: 0 } }, reason, requestId: id }) } }, request => demo.adjust(request.body.memberId, request.body.delta, request.body.reason, request.body.requestId));
    routes.post<{ Params: { id: string }; Body: { requestId: string } }>('/members/:id/revoke-barcode', { schema: actionSchema }, request => demo.revokeBarcode(request.params.id, request.body.requestId));
    routes.post<{ Params: { id: string }; Body: { requestId: string } }>('/sales/:id/reverse', { schema: actionSchema }, request => demo.reverse(request.params.id, request.body.requestId));
    routes.post<{ Params: { memberId: string } }>('/wallet/:memberId/sync', { schema: { params: body({ memberId: id }), body: body({}) } }, request => demo.sync(request.params.memberId));
    routes.post<{ Body: { clpPerToken: number; expectedRevision: number; rewardCosts?: { coffee: number; discount: number } } }>('/program', {
      schema: { body: body({ clpPerToken: { type: 'integer', minimum: 1, maximum: 1_000_000 }, expectedRevision: { type: 'integer', minimum: 0 }, rewardCosts: body({ coffee: { type: 'integer', minimum: 1, maximum: 100_000 }, discount: { type: 'integer', minimum: 1, maximum: 100_000 } }) }, ['clpPerToken', 'expectedRevision']) },
    }, request => demo.configure(request.body.clpPerToken, request.body.expectedRevision, request.body.rewardCosts));
    routes.post<{ Body: { available: boolean } }>('/wallet-availability', { schema: { body: body({ available: { type: 'boolean' } }) } }, request => demo.availability(request.body.available));
    routes.post('/reset', { schema: { body: body({ confirmation: { const: 'reset_synthetic_loyalty' } }) } }, () => demo.reset());
  }, { prefix: '/api/demo/loyalty' });
}

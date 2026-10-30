import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { MemoryStore, Order } from '../platform/domain.ts';
import type { Locale } from '../platform/i18n.ts';
import type { WhatsAppTransport } from '../integrations/contracts.ts';
import { WhatsAppDeliveryError } from '../integrations/whatsapp.ts';
import { AccessError, type Identity, type PostgresRepository } from './database.ts';

type Reason = 'help' | 'allergy' | 'payment_exception' | 'unknown_request';
type Kind = 'accepted' | 'ready' | 'store_payment_recorded';

export function handoffReason(input: string): Reason | undefined {
  const text = input.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  if (/\b(allerg\w*|alerg\w*|celiac\w*|celiac\w*)\b/.test(text)) return 'allergy';
  if (/\b(refund\w*|reembolso\w*|charged|cobrado|cobro|duplicate payment|pago duplicado|payment problem|problema de pago)\b/.test(text)) return 'payment_exception';
  if (/\b(help|ayuda|human|humano|staff|persona|operator|operador)\b/.test(text)) return 'help';
  if (!text || ['english','ingles','spanish','espanol','nuevo','new','confirmar','confirm','carrito','cart','vaciar','clear','hola','hello','hi','menu'].includes(text) || /^(quitar|remove) /.test(text) || /^\d/.test(text)) return undefined;
  return 'unknown_request';
}

export class WhatsAppSupport {
  async bindOrder(state: MemoryStore, client: PoolClient, identity: Identity, phoneId: string, job: { sender: string }) {
    const orderId = state.sessions.get(`${identity.tenantId}:${job.sender}`)?.orderId;
    const order = orderId ? state.orders.get(orderId) : undefined;
    if (!order || order.customerId !== job.sender) return;
    await client.query(`INSERT INTO whatsapp_order_contacts(tenant_id,branch_id,order_id,phone_id,recipient)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [identity.tenantId, identity.branchId, order.id, phoneId, job.sender]);
  }

  // Called inside the same branch transaction as inbound domain processing.
  async intercept(state: MemoryStore, client: PoolClient, identity: Identity, phoneId: string, job: { message_id: string; sender: string; message_text: string }) {
    const reason = handoffReason(job.message_text);
    if (!reason) return undefined;
    const key = `${state.tenant.id}:${job.sender}:${job.message_id}`;
    if (state.inbox.has(key)) return state.inbox.get(key);
    await client.query(`INSERT INTO whatsapp_handoffs(tenant_id,branch_id,phone_id,message_id,reason)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [identity.tenantId, identity.branchId, phoneId, job.message_id, reason]);
    const locale = state.session(job.sender).locale;
    const response = locale === 'en' ?
      (reason === 'allergy' ? 'Your allergy question needs staff review. Do not rely on this chat for ingredient or allergen safety. Your cart has not changed.' :
        'Your request needs staff review. Your cart has not changed. This chat cannot promise a response time; contact the restaurant directly if urgent.') :
      (reason === 'allergy' ? 'Tu consulta de alergias necesita revisión del personal. No confíes en este chat para confirmar ingredientes o seguridad de alérgenos. Tu carrito no cambió.' :
        'Tu solicitud necesita revisión del personal. Tu carrito no cambió. Este chat no puede prometer un tiempo de respuesta; contacta directamente al local si es urgente.');
    state.inbox.set(key, response);
    return response;
  }
}

function notificationText(kind: Kind, locale: Locale, order: Order) {
  const prefix = order.paymentMethod === 'webpay_sandbox' ? (locale === 'en' ? 'SANDBOX TEST — ' : 'PRUEBA SANDBOX — ') : '';
  const label = order.id.slice(0, 8);
  const text = locale === 'en' ? {
    accepted: `Order ${label}: the restaurant accepted your pickup order.`,
    ready: `Order ${label}: ready for pickup at the restaurant.`,
    store_payment_recorded: `Order ${label}: staff recorded payment received at pickup.`,
  } : {
    accepted: `Pedido ${label}: el local aceptó tu pedido para retiro.`,
    ready: `Pedido ${label}: listo para retirar en el local.`,
    store_payment_recorded: `Pedido ${label}: el personal registró el pago recibido en el local.`,
  };
  return prefix + text[kind];
}

export class WhatsAppNotifications {
  constructor(readonly repository: PostgresRepository, readonly transport: WhatsAppTransport, readonly phoneId: string) {}

  async stage(identity: Identity) {
    const pending = await this.repository.pool.query(`SELECT 1 FROM outbox e JOIN orders o ON o.tenant_id=e.tenant_id AND o.branch_id=e.branch_id AND o.id=e.order_id
      JOIN whatsapp_order_contacts c ON c.tenant_id=o.tenant_id AND c.branch_id=o.branch_id AND c.order_id=o.id
      WHERE e.tenant_id=$1 AND e.branch_id=$2 AND c.phone_id=$3 AND e.event_type IN ('order.state_changed','sandbox.test_authorized') AND o.fulfillment='local' AND (o.payment_method<>'webpay_sandbox' OR o.payment_state='sandbox_authorized')
      AND (((e.payload->>'status'='preparing' OR e.event_type='sandbox.test_authorized') AND o.status='preparing' AND NOT EXISTS (SELECT 1 FROM whatsapp_notifications n WHERE n.tenant_id=o.tenant_id AND n.branch_id=o.branch_id AND n.order_id=o.id AND n.kind='accepted'))
        OR (e.payload->>'status'='ready' AND o.status='ready' AND NOT EXISTS (SELECT 1 FROM whatsapp_notifications n WHERE n.tenant_id=o.tenant_id AND n.branch_id=o.branch_id AND n.order_id=o.id AND n.kind='ready'))
        OR (e.payload->>'paymentState'='store_paid' AND o.payment_state='store_paid' AND NOT EXISTS (SELECT 1 FROM whatsapp_notifications n WHERE n.tenant_id=o.tenant_id AND n.branch_id=o.branch_id AND n.order_id=o.id AND n.kind='store_payment_recorded'))) LIMIT 1`, [identity.tenantId, identity.branchId, this.phoneId]);
    if (!pending.rowCount) return;
    return this.repository.transaction(identity, 'whatsapp.notifications.stage', async (state, client) => {
      const events = await client.query(`SELECT e.order_id,e.event_type,e.payload,c.recipient FROM outbox e JOIN whatsapp_order_contacts c USING(tenant_id,branch_id,order_id)
        WHERE e.tenant_id=$1 AND e.branch_id=$2 AND c.phone_id=$3 AND e.event_type IN ('order.state_changed','sandbox.test_authorized')
        ORDER BY e.created_at,e.event_key`, [identity.tenantId, identity.branchId, this.phoneId]);
      for (const event of events.rows) {
        const order = state.orders.get(event.order_id);
        if (!order || order.fulfillment !== 'local' || order.paymentMethod === 'simulation' || (order.paymentMethod === 'webpay_sandbox' && order.paymentState !== 'sandbox_authorized')) continue;
        const kinds: Kind[] = [];
        if ((event.payload.status === 'preparing' || event.event_type === 'sandbox.test_authorized') && order.status === 'preparing') kinds.push('accepted');
        if (event.payload.status === 'ready' && order.status === 'ready') kinds.push('ready');
        if (event.payload.paymentState === 'store_paid' && order.paymentState === 'store_paid') kinds.push('store_payment_recorded');
        const locale = state.sessions.get(`${identity.tenantId}:${order.customerId}`)?.locale ?? 'es';
        for (const kind of kinds) await client.query(`INSERT INTO whatsapp_notifications(tenant_id,branch_id,phone_id,order_id,kind,recipient,locale,message_text)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
        [identity.tenantId, identity.branchId, this.phoneId, order.id, kind, event.recipient, locale, notificationText(kind, locale, order)]);
      }
    });
  }

  async sendOne(identity: Identity) {
    const work = await this.repository.pool.query(`SELECT 1 FROM whatsapp_notifications WHERE tenant_id=$1 AND branch_id=$2 AND phone_id=$3
      AND ((state='pending' AND available_at<=now()) OR (state='sending' AND lease_until<now())) LIMIT 1`, [identity.tenantId, identity.branchId, this.phoneId]);
    if (!work.rowCount) return false;
    const claim = randomUUID();
    const notification = await this.repository.transaction(identity, 'whatsapp.notifications.claim', async (state, client) => {
      await client.query(`UPDATE whatsapp_notifications SET state='needs_attention',error_code='send_outcome_unknown',lease_until=NULL
        WHERE tenant_id=$1 AND branch_id=$2 AND phone_id=$3 AND state='sending' AND lease_until<now()`, [identity.tenantId, identity.branchId, this.phoneId]);
      const found = await client.query(`SELECT * FROM whatsapp_notifications WHERE tenant_id=$1 AND branch_id=$2 AND phone_id=$3
        AND state='pending' AND available_at<=now() ORDER BY id LIMIT 1 FOR UPDATE`, [identity.tenantId, identity.branchId, this.phoneId]);
      const row = found.rows[0];
      if (!row) return undefined;
      const order = state.orders.get(row.order_id);
      const valid = order?.fulfillment === 'local' && (order.paymentMethod !== 'webpay_sandbox' || order.paymentState === 'sandbox_authorized') && ((row.kind === 'accepted' && order.status === 'preparing') ||
        (row.kind === 'ready' && order.status === 'ready') || (row.kind === 'store_payment_recorded' && order.paymentState === 'store_paid'));
      if (!valid) {
        await client.query("UPDATE whatsapp_notifications SET state='superseded',completed_at=now() WHERE id=$1", [row.id]);
        return { skipped: true as const };
      }
      const inbound = await client.query(`SELECT max(provider_timestamp) AS latest FROM whatsapp_jobs WHERE tenant_id=$1 AND branch_id=$2 AND phone_id=$3
        AND sender=$4 AND provider_timestamp<=now()`, [identity.tenantId, identity.branchId, this.phoneId, row.recipient]);
      const until = inbound.rows[0].latest ? new Date(inbound.rows[0].latest).getTime() + 24 * 60 * 60 * 1000 : 0;
      // Reserve the production transport's full timeout. Missing/expired windows
      // route to staff; there is no implicit template or marketing fallback.
      if (until <= Date.now() + 10_000) {
        await client.query("UPDATE whatsapp_notifications SET state='staff_required',error_code='customer_window_closed',completed_at=now() WHERE id=$1", [row.id]);
        return { skipped: true as const };
      }
      await client.query("UPDATE whatsapp_notifications SET state='sending',attempts=attempts+1,claim_id=$2,lease_until=now()+interval '60 seconds' WHERE id=$1", [row.id, claim]);
      return { ...row, until, skipped: false as const };
    });
    if (!notification) return false;
    if (notification.skipped) return true;
    if (notification.until <= Date.now() + 10_000) {
      await this.repository.pool.query("UPDATE whatsapp_notifications SET state='staff_required',error_code='customer_window_closed',lease_until=NULL WHERE id=$1 AND claim_id=$2 AND state='sending'", [notification.id, claim]);
      return true;
    }
    try {
      const receipt = await this.transport.sendText(notification.recipient, notification.message_text);
      await this.repository.pool.query(`UPDATE whatsapp_notifications SET state='sent',provider_message_id=$3,completed_at=now(),lease_until=NULL
        WHERE id=$1 AND claim_id=$2 AND state='sending' AND tenant_id=$4 AND branch_id=$5`, [notification.id, claim, receipt?.id ?? null, identity.tenantId, identity.branchId]);
    } catch (error) {
      const known = error instanceof WhatsAppDeliveryError;
      const retry = known && error.retryable && notification.attempts < 4;
      await this.repository.pool.query(`UPDATE whatsapp_notifications SET state=$3,error_code=$4,available_at=now()+$5*interval '1 second',lease_until=NULL
        WHERE id=$1 AND claim_id=$2 AND state='sending' AND tenant_id=$6 AND branch_id=$7`,
      [notification.id, claim, retry ? 'pending' : known ? 'failed' : 'needs_attention', known ? 'provider_rejected' : 'send_outcome_unknown', Math.min(300, 2 ** (notification.attempts + 1)), identity.tenantId, identity.branchId]);
    }
    return true;
  }
}

export class WhatsAppSupportReview {
  constructor(readonly repository: PostgresRepository) {}

  list(identity: Identity) {
    return this.repository.transaction(identity, 'whatsapp.support.read', async (_state, client) => {
      const scope = [identity.tenantId, identity.branchId];
      const handoffs = await client.query("SELECT id::text,reason,state,created_at,reviewed_at FROM whatsapp_handoffs WHERE tenant_id=$1 AND branch_id=$2 AND state='open' ORDER BY id LIMIT 100", scope);
      const notifications = await client.query(`SELECT id::text,kind,state,attempts,error_code,created_at,completed_at,state='sent' AS "providerAccepted",false AS "deliveryConfirmed"
        FROM whatsapp_notifications WHERE tenant_id=$1 AND branch_id=$2 ORDER BY id DESC LIMIT 100`, scope);
      return { handoffs: handoffs.rows, notifications: notifications.rows, limit: 100 };
    });
  }

  review(identity: Identity, id: string) {
    if (!identity.tokenId) throw new AccessError(403);
    return this.repository.transaction(identity, `whatsapp.support.review:${id}`, async (_state, client) => {
      const result = await client.query(`UPDATE whatsapp_handoffs SET state='reviewed',reviewed_at=now() WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 AND state='open' RETURNING id::text,state`, [id, identity.tenantId, identity.branchId]);
      if (!result.rowCount) throw Object.assign(new Error('Support state changed.'), { statusCode: 409 });
      return { ...result.rows[0], customerContacted: false };
    });
  }
}

export function registerWhatsAppSupportRoutes(app: FastifyInstance, repository: PostgresRepository | undefined, identity: (request: FastifyRequest) => Identity | undefined) {
  const review = repository ? new WhatsAppSupportReview(repository) : undefined;
  app.get('/api/whatsapp/support', async request => review ? review.list(identity(request)!) : { handoffs: [], notifications: [], limit: 100 });
  app.post<{ Params: { id: string }; Body: { confirmation: string } }>('/api/whatsapp/support/:id/review', {
    schema: {
      params: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string', pattern: '^[1-9][0-9]{0,17}$' } } },
      body: { type: 'object', additionalProperties: false, required: ['confirmation'], properties: { confirmation: { const: 'reviewed_without_contact' } } },
    },
  }, async request => {
    if (!review) throw Object.assign(new Error('Durable mode required.'), { statusCode: 409 });
    return review.review(identity(request)!, request.params.id);
  });
}

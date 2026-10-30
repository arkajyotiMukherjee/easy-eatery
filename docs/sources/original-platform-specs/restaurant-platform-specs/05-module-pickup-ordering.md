# Module Specification — Pickup Ordering & Kitchen Dashboard

## 1. Product contract

**Commercial module:** `pickup-ordering`  
**Purpose:** Direct website pickup ordering with requested/scheduled pickup times and a reliable restaurant order workflow. QR menu is optional; this module can expose its own branded storefront.

Required capabilities: `catalog.read_orderable`, `order-management`, `pickup-slot-rules`. A payment provider is required only if online prepayment is selected; support `pay-at-pickup` when the restaurant explicitly enables it.

## 2. MVP customer flow

1. Customer opens a branch storefront (direct link, website, social link or WhatsApp link—QR is not required).
2. Selects items/modifiers; frontend displays current price and availability.
3. Selects ASAP or an available pickup slot.
4. Enters minimum contact details needed for order updates; marketing consent is separate and unchecked by default.
5. Server validates catalog version, opening hours, item availability, modifiers, pickup capacity and total.
6. Create a pending order with an idempotency key.
7. If prepaid, create provider payment; only verified provider status confirms payment.
8. On confirmed order/payment policy, mark order accepted and notify kitchen.
9. Kitchen staff move through configured statuses; customer receives order status and pickup instructions.
10. Complete/cancel/refund/reconcile with clear state history.

## 3. State machines

Order state and payment state must be separate.

Order (initial proposal): `draft -> pending_confirmation -> confirmed -> preparing -> ready -> completed`; terminal exceptions: `cancelled`, `rejected`, `expired`. If restaurant acceptance is manual, `pending_confirmation` remains until accepted. Define allowed transitions in one domain service.

Payment: `not_required | pending | requires_action | authorized | paid | failed | cancelled | partially_refunded | refunded | unknown`. Actual states map provider-specific statuses into this internal set. No UI redirect may directly set payment to `paid`.

## 4. Data model

- `orders(id, tenant_id, branch_id, channel, status, customer_id nullable, guest_contact_json, pickup_slot_start, pickup_slot_end, currency, subtotal_minor, discount_minor, tax_minor, total_minor, catalog_version, idempotency_key, created_at)`
- `order_items` with immutable name/price/modifier snapshots, quantity, notes, source catalog ID.
- `order_status_history(order_id, old_status, new_status, actor_id, reason, occurred_at)`
- `pickup_slots(tenant_id, branch_id, local_date, start_local, end_local, max_orders, current_count, enabled)`
- `payment_attempts(order_id, provider, provider_reference, idempotency_key, amount_minor, currency, status, timestamps)`
- `payment_webhook_inbox(provider, provider_event_id, received_at, processing_status, payload_redacted)`

All monetary values are integer CLP and item price/description snapshots are immutable after confirmed order except audited adjustments.

## 5. API sketch

- `POST /api/v1/public/branches/:slug/order-quotes` — validate cart and return authoritative total/availability; not a durable order.
- `GET /api/v1/public/branches/:slug/pickup-slots?date=YYYY-MM-DD`.
- `POST /api/v1/public/branches/:slug/orders` — requires idempotency key; creates order.
- `GET /api/v1/public/orders/:publicToken` — minimal order tracking, rate-limited and unguessable token.
- `POST /api/v1/admin/orders/:id/accept|reject|transition` through a single transition endpoint/policy.
- Provider webhooks under `/api/v1/webhooks/payments/:provider`.

These are product routes, not provider API endpoints.

## 6. Kitchen dashboard

- Lanes for New/Confirmed, Preparing, Ready, Completed (hide completed by default after a time window).
- Order card shows order number, elapsed time, promised pickup time, item count, modifiers, customer initials/limited detail and payment state.
- Touch-friendly state transition actions; server validates permissions and current transition.
- SSE stream for `order.status_changed.v1`, with polling fallback and last-event/connection indicator.
- On reconnect, fetch authoritative lane snapshot; SSE is a notification channel, not the source of truth.
- Optional sound/visual alerts configured per branch.
- Never display PII beyond what kitchen staff need.

## 7. Scheduling/availability logic

- Store the branch's opening hours and pickup slot definitions in local time with IANA zone.
- Handle DST/holiday closures and manual “temporarily closed” state.
- Reserve slot capacity atomically to avoid overbooking. Use database row locks or conditional updates.
- A provider payment pending timeout should release slot only under an explicit policy; avoid freeing capacity while a payment can still complete without reconciliation.

## 8. Integration and recovery

- Payment create request idempotent per order/attempt.
- Provider webhook is verified, stored in inbox, and enqueued; respond quickly; heavy processing in worker.
- `payment.succeeded` and order-confirmation side effects are idempotent.
- Support reconciliation query/report for “payment provider says paid, platform not paid” and inverse cases.
- If a POS connection exists, submitting the order to POS must be a retryable job and independent from customer payment confirmation. Show POS sync status; do not silently duplicate external orders.
- POS order submission failure must result in visible operator alert/manual recovery. Do not tell the customer the restaurant received the order if submission is a mandatory acceptance condition and it failed.

## 9. V1 boundaries

Include only one selected checkout provider or pay-at-pickup, simple modifiers, limited pickup slot configuration and one kitchen board. Exclude delivery fleet/logistics, multi-channel dispatch, complex promotions, gift cards, refunds automation across multiple providers and complex tax/fiscal receipts until validated.

## 10. Acceptance tests

- Repeated checkout request with same idempotency key creates one order.
- Client price tampering does not affect calculated total.
- Two concurrent requests cannot oversubscribe a slot.
- Payment return URL alone cannot mark paid.
- Duplicate/reordered webhooks do not double-confirm or double-earn points.
- Kitchen reconnect restores current state; no lost order due to missing SSE event.
- Module works when QR menu is disabled.

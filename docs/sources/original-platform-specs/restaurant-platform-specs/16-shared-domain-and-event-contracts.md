# Shared Domain Model, API & Event Contracts

## 1. Global identifiers and money/time rules

- All entities have UUID/ULID internal IDs, `tenant_id`, created/updated timestamps where applicable, and branch scope where operationally necessary.
- External provider IDs are stored separately with provider name and connection ID. Never use provider ID as platform primary key.
- Store instants as `timestamptz`; schedule local events in `America/Santiago` plus explicit timezone.
- Money: `amount_minor` integer and ISO currency code. CLP UI usually displays whole pesos; do not use floating-point arithmetic.
- Every write that may be retried receives an idempotency key where appropriate.

## 2. Canonical core entities

- `Tenant`: commercial customer/business account and module subscriptions.
- `Branch`: physical location, address, hours, local policies, timezone and connected POS/payment configuration.
- `User`, `Membership`, `Role`, `Permission`.
- `ModuleCatalog`, `Subscription`, `Entitlement`.
- `Catalog`, `MenuCategory`, `MenuItem`, `ModifierGroup`, `ModifierOption`.
- `Customer`, `CustomerIdentity`, `Consent`.
- `Order`, `OrderItem`, `OrderStatusHistory`.
- `PaymentAttempt`, `Refund`, `PaymentEvent`.
- `LoyaltyAccount`, `LoyaltyTransaction`, `LoyaltyRedemption`, `WalletPass`.
- `IntegrationConnection`, `SyncRun`, `ProviderEventInbox`, `OutboxEvent`.
- `EventLead`, `Quote`, `QuoteItem`, `QuoteVersion`.
- `Conversation`, `Message`, `Campaign`, `CampaignRecipient`, `SuppressionEntry`.
- `AuditLog`.

This is a boundary outline, not a request to create every table in M0/M1. Only migrate what the first workflow requires.

## 3. Event envelope

All domain events use an envelope similar to:

```json
{
  "id": "uuid",
  "type": "order.confirmed.v1",
  "schemaVersion": 1,
  "occurredAt": "2026-10-15T12:00:00Z",
  "tenantId": "uuid",
  "branchId": "uuid",
  "aggregateType": "order",
  "aggregateId": "uuid",
  "correlationId": "uuid",
  "causationId": "uuid-or-null",
  "data": {}
}
```

No full PII, credentials or raw message body in the general event envelope. Consumers query authorized domain records as needed.

## 4. Initial event taxonomy

- `catalog.published.v1`
- `order.created.v1`, `order.confirmed.v1`, `order.status_changed.v1`, `order.completed.v1`, `order.cancelled.v1`
- `payment.created.v1`, `payment.succeeded.v1`, `payment.failed.v1`, `payment.refunded.v1`, `payment.reconciliation_required.v1`
- `pos.sale.imported.v1`, `pos.order.status_changed.v1`, `pos.connection.degraded.v1`
- `customer.identity_linked.v1`, `customer.consent_changed.v1`, `customer.privacy_request_created.v1`
- `loyalty.points_earned.v1`, `loyalty.reward_redeemed.v1`, `loyalty.points_reversed.v1`, `wallet.pass_sync_failed.v1`
- `quote.created.v1`, `quote.sent.v1`, `quote.accepted.v1`, `quote.expired.v1`
- `whatsapp.message_received.v1`, `whatsapp.message_delivery_changed.v1`, `campaign.approved.v1`, `campaign.opt_out.v1`
- `module.entitlement_changed.v1`

Version schema changes deliberately; do not change meaning of an event while retaining same version.

## 5. Transactional outbox/inbox

- Business transaction inserts/updates primary entity and one `outbox_events` row before commit.
- Worker leases event, publishes internally/executes consumer, marks completion and tracks attempts.
- At-least-once processing means consumer checks event ID/source reference uniqueness.
- Failed jobs move to dead-letter state after bounded retries and appear in dashboard/alerting.
- Replay requires operator permission and must remain idempotent.
- Provider webhook is first inserted to `webhook_inbox` with dedupe key; acknowledge quickly; worker processes after persistence.

## 6. API conventions

- `/api/v1` path version.
- Tenant/branch context always derived from authenticated membership or validated public slug/token.
- Public routes use rate limiting, opaque order tracking tokens and reduced fields.
- Standard errors: `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `PROVIDER_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `REQUIRES_ACTION`.
- Include `requestId` for support.
- Do not reveal whether arbitrary foreign tenant object IDs exist.
- OpenAPI documented, request/response schemas validated, generated docs reviewed.

## 7. Critical invariants

- Payment success comes from verified provider status, not frontend.
- Order item prices are server-calculated and snapshots stored on confirm.
- Loyalty changes are ledger entries; no balance-only mutation.
- Identity merge requires defensible match; every merge/unmerge is audited.
- Entitlement guard on server every time; UI gating is secondary.
- A module being disabled cannot stop unrelated consumers of a shared event.
- Deletion and cancellation are domain-specific states, not generic hard delete.

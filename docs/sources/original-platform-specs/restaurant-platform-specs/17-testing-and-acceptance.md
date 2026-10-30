# Testing Strategy & Definition of Done

## 1. Test layers

1. **Unit/domain tests:** state machines, pricing, CLP calculations, point rules, RFM and entitlement resolution.
2. **Database integration tests:** transactions, constraints, locking, tenant filters, outbox/inbox and migrations against real PostgreSQL in CI.
3. **Provider contract tests:** sandbox/fake server schemas and normalized status mapping. Keep sanitized fixtures with provider permission; never commit real secrets or customer data.
4. **End-to-end tests:** Playwright across public/customer, owner admin, kitchen and module activation flows.
5. **Operational tests:** webhook replay, worker retry, rate-limit response, backup restoration, credential rotation and provider outage.

## 2. MVP critical scenarios

### Platform/entitlements
- Tenant A cannot read/update Tenant B's data even if IDs are known.
- Pickup enabled, QR disabled: storefront and orders work.
- Catering enabled alone: quote page and leads work.
- Disabled module API returns controlled `FORBIDDEN/FEATURE_NOT_ENABLED`; no data mutation.
- User branch scope enforced at API.

### Orders/payments
- Duplicate checkout request produces one order.
- Price tampering/modifier injection does not change server total.
- Concurrent pickup requests cannot exceed slot capacity.
- Payment return redirect without verified provider success leaves payment pending.
- Duplicate/late/out-of-order provider events do not double process.
- Provider timeout after create triggers status lookup/reconciliation, not blind duplicate order creation.
- Refund/reversal preserves original event/audit.

### POS
- Product mapping/unknown product surfaced before order send.
- API 429 respects provider rate limit and backoff.
- Token expiry prompts reconnection/refresh safely.
- Duplicate webhook/sale import creates one canonical record.
- Provider sale total and normalized totals can be reconciled.
- Order submit timeout has a manual recovery path; no silent retry duplicates.

### Loyalty
- Concurrent redemption cannot overspend.
- Same eligible sale earns only once per rule version.
- Refund creates reversal.
- Google Wallet API failure leaves ledger intact and retries pass update.
- Staff adjustment requires permission and reason.

### WhatsApp/CRM/privacy
- Opt-out after schedule but before send blocks message.
- Duplicate provider webhook does not duplicate order/message state.
- AI suggestion cannot set price/paid state or access another tenant.
- Customer with no consent not included in marketing campaign.
- Anonymous sale stays anonymous.

### Catering
- Quote uses deterministic total and stored rule version.
- Pricing update does not alter prior quote.
- PDF failure is visible and allows retry/manual fallback.
- Date is not called reserved unless the availability workflow explicitly confirms it.

## 3. Definition of Done for a ticket

- Acceptance criteria implemented and tests added.
- API/schema/docs updated.
- Tenant and permission boundary verified.
- Loading, empty, error, retry and success UI states included.
- Logs and metrics include correlation/request IDs without secrets/PII leakage.
- Migration is safe for rolling deploy or explicitly coordinated.
- Disabled-module behavior is handled.
- New provider capability is documented in capability matrix.
- Spanish (Chile) user-facing copy reviewed.
- No secret, real customer data or card data committed.

## 4. Definition of Done for a module

- Can be enabled independently with documented prerequisites.
- Has own onboarding checklist, health state, operational runbook and success metric.
- Has at least one full end-to-end test.
- Its critical domain operation is idempotent and audited.
- Has privacy/retention behavior and permission matrix.
- Clear manual fallback for provider outages.
- Tested when adjacent commercial modules are disabled.

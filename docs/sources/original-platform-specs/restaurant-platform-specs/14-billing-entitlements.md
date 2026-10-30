# Modular Catalog, Subscription Billing & Entitlements

## 1. Goals

A restaurant picks services independently (like a hosting provider buying separate hosting/email/marketing products). Each purchased module activates its routes, jobs and integration setup. Shared capabilities are platform infrastructure and are not automatically charged as separate modules. Pricing should be understandable before enablement and should scale with third-party costs.

## 2. Separate four concepts

1. **Catalog:** what products/modules can be bought and their price/usage rules.
2. **Subscription:** what tenant has purchased, billing period/status and external subscription reference.
3. **Entitlements:** what the tenant can use right now, possibly during trial/grace period.
4. **Usage:** metered activity used for limits or overage charges.

A payment failure does not delete data or abruptly corrupt an ongoing order. Apply clear grace/suspension policies and preserve required data access/export.

## 3. Tables

- `module_catalog(id, version, name, public_description, base_price_minor, currency, billing_period, usage_policy_json, required_capabilities_json, optional_integrations_json, active)`
- `tenant_subscriptions(id, tenant_id, status, provider, external_subscription_id, current_period_start, current_period_end, trial_end, grace_until, cancel_at_period_end)`
- `subscription_items(id, subscription_id, module_id, module_version, quantity, price_snapshot_minor, status)`
- `tenant_entitlements(tenant_id, entitlement_key, scope_type, scope_id, enabled, source_subscription_item_id, effective_from, effective_to)`
- `usage_records(id, tenant_id, module_id, usage_type, quantity, unit, idempotency_key, occurred_at, metadata_minimized)`
- `billing_events(provider, external_event_id, status, processed_at)`.

Store price snapshots so future price changes don't mutate prior invoices. Keep platform subscriptions separate from restaurant customer payments.

## 4. Dependency/activation flow

1. Owner selects modules and sees clear monthly/annual pricing, usage allowance, provider fees excluded/included and any prerequisites.
2. Backend resolves required capabilities. If adding pickup requires order management/catalog, those are provisioned as shared capabilities but not shown as a separate commercial charge unless product strategy explicitly prices them.
3. Owner confirms selection and terms.
4. Create subscription or record pilot/manual billing status.
5. Activate entitlements transactionally and launch onboarding checklists.
6. Enable provider connection only when owner authorizes it; don't request integrations unrelated to purchased modules.
7. On cancellation, stop new billable activity according to policy; retain data for configured grace/export/retention; don't delete shared records still used by another active module.

## 5. Dependency graph

Example:
- `qr-menu -> catalog.read_published`
- `pickup-ordering -> catalog.read_orderable + order-management + pickup-slot-rules`
- `loyalty -> loyalty-ledger + customer-identity (minimal); Google Wallet optional`
- `crm -> customer-records + consent + event-aggregation`
- `whatsapp-ordering -> messaging + order-management`; payment adapter optional if pay-at-pickup is available
- `whatsapp-campaigns -> messaging + consent/suppression + audience source`; CRM segments optional, manual/list-based audience only if policy permits
- `catering -> quote-engine + lead-records + PDF`; email/WhatsApp delivery optional

Make the graph declarative and validated at startup/CI. Detect dependency cycles in tests.

## 6. Pricing model recommendation

- Fixed monthly module charge for core workflow.
- Included usage allowance where it helps customers predict cost (e.g. outbound messages or AI calls); show current provider cost pass-through/overage rules transparently.
- Optional one-time onboarding fee for provider setup only if measured manual work justifies it; avoid bespoke price negotiations becoming the default.
- Multi-branch pricing is explicit: per tenant base + additional branch or usage-based tier, based on validated buyer willingness.
- Pilot may be free/discounted but must have defined duration, success metrics and conversion offer.

Avoid exposing every underlying technical capability as a separate invoice item. Do not subsidize unlimited WhatsApp/AI usage without caps.

## 7. Chile billing provider

Evaluate Mercado Pago recurring/subscription capability for platform billing, subject to merchant eligibility, recurring payment support, cancellation rules and fees: <https://www.mercadopago.cl/developers/>. Manual invoicing/transfer may be enough for the first customer. Do not make automated platform billing a V1 blocker unless customer insists. Separately validate Chilean tax invoicing obligations with an accountant; provider payment receipt is not assumed to be an SII electronic fiscal document.

## 8. Acceptance criteria

- Owner can purchase pickup without QR and catering without CRM.
- A module entitlement cannot be self-enabled via client manipulation.
- Module cancellation doesn't erase shared data still needed by active modules.
- Usage events deduplicate and are auditable.
- Price and usage rules shown before the owner confirms.
- Subscription/payment provider webhook retries are idempotent.

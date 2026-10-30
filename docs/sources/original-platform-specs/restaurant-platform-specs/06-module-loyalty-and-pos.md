# Module Specification — Loyalty, Google Wallet & POS Verification

## 1. Product contract

**Commercial module:** `loyalty`  
**Purpose:** Let a restaurant operate a transparent points/reward program, enrol members in Google Wallet, earn points from verified eligible purchases and redeem rewards during supported checkout workflows. The Wallet pass is a presentation/identification layer; the platform ledger is authoritative.

Loyalty must work without QR menu or CRM campaign module. Google Wallet and POS are optional providers, but an earning/redemption method must be available for an active loyalty deployment (e.g. staff-assisted lookup/scan and admin adjustment with audit) or the module must clearly remain in setup mode.

## 2. MVP phases

**MVP-A:** rule configuration, member ID/barcode, immutable points ledger, staff search/scan, manual earned-points adjustment with reason, redemption validation and transaction history.  
**MVP-B:** Google Wallet loyalty object creation/update.  
**MVP-C:** automated POS sale ingestion and redemption writeback only after the provider supports the required events/actions.

Never promise “real-time POS loyalty” if the connector only permits read-only sales import or manual polling.

## 3. Data model

- `loyalty_programs(tenant_id, name, status, earning_rule_version, redemption_rules_json, expiry_policy_json)`
- `loyalty_accounts(tenant_id, customer_id, account_code, current_balance, status)`
- `loyalty_transactions(id, tenant_id, account_id, type, points_delta, source, source_reference, idempotency_key, rule_version, actor_id, reason, occurred_at)` — immutable append-only ledger.
- `loyalty_redemptions(id, tenant_id, account_id, order_id nullable, reward_id, points_reserved, status, idempotency_key, branch_id, actor_id)`
- `loyalty_rewards(id, tenant_id, name, points_cost, reward_type, eligible_item_ids, discount_rules, active)`
- `wallet_passes(tenant_id, account_id, issuer_id, class_id, object_id, sync_state, last_sync_at, last_error_code)`
- `loyalty_sale_events` or canonical `provider_events` for POS source IDs and deduplication.

Balance is a cached projection of the ledger. Write both ledger entry and account balance in one DB transaction. Enforce unique idempotency keys and a unique `(tenant_id, provider, external_sale_id, rule_version)` or equivalent earning key.

## 4. Earning rules

Owner-configurable parameters: eligible subtotal definition, included/excluded categories, accrual rate, rounding method, branch scope, campaign multiplier and refund/reversal policy. For Chile and CLP, define an integer monetary basis; e.g. points per `CLP 10,000` is only an example, not a hard-coded rule. Make rule versions immutable once used; changing the rule applies to future eligible events only unless an explicit retroactive recalculation is run.

Accrue only from an authoritative paid/closed sale or a staff adjustment with reason. If a POS event is not trustworthy or sale total is incomplete, hold for review instead of issuing spendable points automatically.

## 5. Redemption rules

- Customer/staff identity is resolved before redemption.
- Reserve/deduct points atomically using a balance check and transaction lock/conditional update.
- Tie redemption to order/POS transaction and branch.
- Mark as completed only when the corresponding sale/checkout condition is confirmed; otherwise release reservation or reverse with auditable entry.
- Refunds/cancellations create compensating ledger records, never edit/delete original entries.
- Prevent repeated QR scans from redeeming the same reward twice using single-use server-issued redemption tokens/nonce and expiry.

## 6. Google Wallet implementation

Official API uses a `LoyaltyClass` for program-level styling and a `LoyaltyObject` for each customer pass. The object can include `accountId`, `accountName`, `barcode` and `loyaltyPoints.balance`; REST resources include insert/get/list/patch/update. Source: <https://developers.google.com/wallet/reference/rest/v1/loyaltyobject> and <https://developers.google.com/wallet/retail/loyalty-cards/use-cases/create>.

Implementation work:
1. Confirm issuer account, business verification, publishing requirements and service-account permissions before promising launch date.
2. Configure issuer/class per platform/tenant policy. Avoid one class per customer; one program class can have many customer objects.
3. Create unique object ID with issuer ID + opaque suffix; barcode contains opaque random/revocable member token, never PII or the current points balance.
4. Generate pass-save link using the officially documented save-to-Wallet flow.
5. On ledger balance change, enqueue Wallet `patch` of the object's balance and relevant fields; use retry/backoff and track last-sync status.
6. Periodically reconcile platform account balances against Wallet objects for failures.
7. Pass update lag must not change reward eligibility; backend ledger is authoritative.

## 7. POS verification contract

Define provider-neutral adapter capabilities:
- `read_products`, `read_sales`, `read_sale_details`, `receive_sale_events`, `submit_external_order`, `read_order_status`, `apply_discount_or_reward`, `void_or_refund_reference`, `read_customer`.

Every connector capability is recorded as `supported`, `unsupported`, `approval_required`, `not_tested` or `temporarily_unavailable` per account/branch. Do not infer support from another provider's docs.

Staff-assisted V1: scan opaque loyalty QR using a tablet/phone camera or type member code; authenticated staff can look up balance/rewards; reward validation returns a short-lived single-use authorization. If POS cannot consume the authorization, staff marks redemption completed with a required reason and transaction reference; report this as a manual integration, not a POS integration.

Automated V2: receive sale event, normalize identity and final eligible amount, dedupe, evaluate rule version, accrue ledger entry, then update Wallet. Reconcile sales/refunds nightly or at provider-supported interval.

## 8. Customer identity and consent

A member can exist without marketing consent. Record the channel and terms/version for loyalty program acceptance and separately record consent for WhatsApp/email marketing. Phone numbers, names or Wallet `accountName` alone should not be used for fuzzy automatic identity merges.

## 9. Security and fraud

- Barcode token is random, opaque, revocable and rate-limited.
- Redemption requires authenticated staff/POS authority and tenant+branch permissions.
- Store audit trail for manual changes; manager approval threshold can be configured.
- Rate limit lookup and redemption, alert on repeated failed scans, high-value redemption or abnormal point adjustments.
- Don't trust a QR scan on its own as proof a customer has permission to redeem a reward.

## 10. Acceptance criteria

- Concurrent redemption cannot overspend balance.
- Duplicate POS sale events earn once.
- Refund creates reversal rather than deleting original entry.
- Wallet API outage does not corrupt ledger or block valid backend redemption.
- Staff can see Wallet sync state and retry safely.
- Loyalty works with QR menu and CRM marketing both disabled.

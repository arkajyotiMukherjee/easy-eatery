# Module Specification — Restaurant CRM & Data Aggregation

## 1. Product contract

**Commercial module:** `crm`  
**Purpose:** Provide usable customer profiles and aggregated purchase/engagement history from the channels a restaurant has enabled. It must tolerate missing identity and partial channel coverage. CRM is not a prerequisite for pickup orders, WhatsApp order-taking or catering quotations; those modules may create operational records that later become linked to CRM if the CRM module is purchased/enabled.

## 2. V1 features

- Customer profile with verified identifiers, origin/source, purchase summary and consent status.
- Merge/link/unlink workflow requiring evidence and audit.
- Transaction/visit history from platform orders and supported POS imports.
- Simple RFM segmentation: New, Frequent, High Value, At Risk, Inactive; thresholds configurable per restaurant.
- Saved segments and audience preview when campaign module is enabled.
- Import and export with explicit permissions, retention and privacy safeguards.
- No campaign sending if no messaging/marketing module entitlement exists.

## 3. Data model

- `customers(id, tenant_id, display_name, created_at, updated_at, status)`
- `customer_identities(id, tenant_id, customer_id, identity_type, normalized_value_hash, encrypted_value nullable, verification_status, source, linked_at, revoked_at)`; uniqueness scoped to tenant and identifier rules. Hashing/normalization must be designed to support lookup while minimizing unnecessary plaintext storage.
- `customer_consents(id, tenant_id, customer_id, purpose, channel, status, source, notice_version, captured_at, withdrawn_at, evidence_reference)`
- `customer_events(id, tenant_id, customer_id nullable, anonymous_session_id nullable, event_type, source, source_event_id, occurred_at, data_minimized_json)`
- `customer_metrics(tenant_id, customer_id, last_purchase_at, eligible_purchase_count, monetary_value_minor, r_score, f_score, m_score, segment_key, calculated_at)`
- `segment_definitions(tenant_id, key, rules_json, version, active)`
- `customer_merge_audit(tenant_id, from_customer_id, to_customer_id, actor_id, rationale, timestamp)`

Canonical purchase events point to order/sale records. Avoid duplicating raw order data into a CRM JSON blob.

## 4. Identity resolution

Priority levels:
1. Authenticated account/customer ID within tenant.
2. Verified phone/email explicitly linked by customer or staff using a verification step.
3. Provider's stable customer ID if the provider and tenant account scope it reliably.
4. Anonymous transaction when no identity exists.

Never fuzzy-merge by name alone. Phone/email may be shared among family members. Provide review queue for suspected duplicate profiles. Unmerge must preserve original transactions and audit trail.

## 5. RFM and lifecycle definitions

- Recency = days since latest eligible purchase.
- Frequency = distinct completed/refunded-adjusted eligible purchases in configured window.
- Monetary = eligible net spend in CLP in configured window.
- Scores use tenant-configured percentile or simple bands; store calculation version and timestamp.
- Exclude failed/cancelled transactions and apply refund/discount/tax policy consistently.
- Scheduled hourly/daily refresh is sufficient for MVP. Don't run heavy segmentation on every checkout.
- “At risk”/“inactive” are operational labels, not factual claims about a person. Allow tenant configuration and clear thresholds.

## 6. Source collection paths

- Platform pickup order: emit confirmed/completed order events; anonymous unless customer identity was supplied and linked.
- POS: import sales with external IDs and reconciliation state; sales can remain anonymous.
- WhatsApp: store only necessary customer channel identifier and conversation/order metadata; conversation body retention is configurable and minimized.
- Loyalty: link account ID to customer after a supported identification step.
- Catering: business lead/contact record can remain separate from a customer record until consent/identity linking is appropriate.

## 7. Privacy and marketing safety

Operational order messages and marketing campaigns have distinct purposes. Track consent per purpose and channel; default marketing opt-in to false unless a valid documented basis is confirmed by Chilean legal advice. Consent withdrawal must propagate to scheduled/sent campaign suppression. Data export/deletion/rectification requests need an auditable workflow and lawful-retention review. No purchased/inferred sensitive attributes.

## 8. Reporting UX

Show counts, sample audience and rule summary before segment activation. Use small explainable segments initially. Exports require `crm.export` permission and audit; mask identifiers where feasible. Display data freshness and sources for every metric. If POS import is disconnected, mark metrics partial rather than silently showing complete customer history.

## 9. APIs/jobs

- Customer CRUD/link/unlink endpoints under tenant context.
- `POST /api/v1/crm/segments/preview` returns counts and explainable matched rules.
- `POST /api/v1/crm/segments` saves versioned definition.
- Scheduled job recomputes derived RFM metrics.
- Event consumers update aggregates idempotently.

## 10. Acceptance criteria

- POS sales with no customer ID remain usable as aggregate revenue but do not create fake customer profiles.
- Marketing opt-out blocks new campaign sends even if customer remains in an RFM segment.
- Identity merge/unmerge is audited and preserves historical transaction association.
- RFM report shows calculation window, data source coverage and last computed time.
- Disabling CRM does not delete customer records needed by active orders/loyalty; retention/deletion follows policy.

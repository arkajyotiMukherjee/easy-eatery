# Pending GitHub delivery evidence

28 October 2026. These are pending issue comments, not published GitHub updates. Public issue pages are readable, but REST and GraphQL requests are denied by the runtime proxy; the final issue #10 API read still returned Forbidden. Implementation commits `985e7de` and `65167d5` are pushed on `codex/pilot-readiness`. Draft PR creation also returned proxy Forbidden. Apply these issue updates after API access is restored and link those commits and the eventual PR. Preserve unchecked external acceptance criteria; no issue is claimed closed.

## Issues #10 and #12: delivery, staff handoff and notifications

Migration 005 adds scoped versioned staff recovery, including explicit uncertain-send review without resend. Migration 007 stores signed receipt evidence separately from queue outcomes, including out-of-order, duplicate and pre-receipt callbacks. Migration 008 adds verified provider timestamps, human handoff and transactional bilingual local-pickup notifications. Both replies and notifications fail closed outside the verified service window; replay cannot reopen it. Missing-window jobs require staff review, and no unapproved template or marketing fallback is used. Device receipts never authorize payment or queue replay. The redacted staff panel respects viewer/operator/owner roles and records review without claiming customer contact.

Evidence: PostgreSQL/fake-transport tests cover tenant isolation, authorization, races, restart, replay, closed/future windows, bounded rejections, ambiguous sends, state supersession and no false success. Chromium checks cover both languages, desktop/mobile, keyboard acknowledgement, private-field exclusion, credential reset and staff controls. Actual Meta sender/recipient/subscription, real-device acceptance, template approval and retention/deletion policy remain open.

## Issues #14, #15, #17 and #27: sandbox checkout and local fulfillment

Opt-in staff-assisted Webpay integration flow uses durable server-priced merchant/order/session snapshots, one claimed checkout, opaque expiring POST handoff, authoritative commit/status and one local kitchen ticket. Browser return/cancellation is not authorization. Test-authorized totals are separate from real-money revenue. Unknown create/commit/refund outcomes never retry automatically or switch to cash. Owner-only full test reversal requires current authorization and revision; partial/uncertain reversal evidence blocks fulfillment for review.

Evidence: official SDK contract source 52ad60075ce7d9eacf7f8cc42a795ae43bd483ff; mock HTTP transport and PostgreSQL concurrency/restart/mismatch/expiry/reversal tests; Chromium ES/EN owner/operator/viewer checks, POST handoff and fake-gateway full reversal. Actual hosted sandbox success remains unproved because this runtime denies the integration host and approved HTTPS/runtime configuration is absent. Production settlement, production refunds and post-collection refunds are not implemented or accepted.

## Issues #13, #22 and #23: POS readiness

`docs/pos-readiness.md` records the access/capability/evidence matrix and restaurant acceptance checklist. Three synthetic port-boundary tests verify detached authoritative snapshots, failure propagation and no POS invocation for local pickup. No vendor payloads were invented. Fresh documentation-host reads were proxy-blocked and are labeled accordingly. Approved restaurant accounts/contracts, catalog mappings, permissions and actual kitchen acceptance remain outstanding for each provider.

## Issues #18, #19, #20 and #21: local operations evidence

The integrated slice passes 28 application tests and 43 PostgreSQL TAP results. All three ES/EN real-HTTP rehearsal modes pass. The final nonroot Docker image completed the CLP 11,500 synthetic ordering/payment/collection lifecycle, with no build CA/proxy credentials persisted. An isolated custom-format PostgreSQL backup/restore preserved migration checksums, order/payment state, audit records and owner/viewer restrictions. See `docs/operations-rehearsal.md` for the feedback template, staging/rollback/privacy gates and evidence limits.

No restaurant feedback, paid cloud deployment, production restore, approved data-retention policy, real provider order or go/no-go acceptance is claimed. Hosting account/budget, support ownership, production simulation controls and restaurant sign-off remain prerequisites for a live pilot.

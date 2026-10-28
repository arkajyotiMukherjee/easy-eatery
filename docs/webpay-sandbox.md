# Staff-assisted Webpay sandbox checkout

This opt-in workflow uses the fixed Transbank integration endpoint and local kitchen fulfillment. It cannot use a production gateway or POS. Local mock tests cover the application flow; an actual hosted sandbox checkout has not passed because this cloud runtime denies the integration host. Test authorization is tracked separately from sales, cash received and settlement.

## Enable only in an approved test environment

Use PostgreSQL and explicitly apply migrations through 008 using `npm run db:migrate`. Follow `postgres-storage.md` for a disposable development branch and individual staff tokens. Keep existing configuration and data. Do not seed or change a customer branch just to inspect this feature.

Set `WEBPAY_SANDBOX_ENABLED=true`, `WEBPAY_SANDBOX_COMMERCE_CODE`, `WEBPAY_SANDBOX_API_KEY` and `WEBPAY_SANDBOX_RETURN_URL` using secure environment settings. Use only authorized integration credentials, never production merchant credentials. The return URL must be an approved public HTTPS URL ending in `/sandbox/return`; no public tunnel or hosting is provisioned by this change. The outbound hostname is fixed to `webpay3gint.transbank.cl`. Missing configuration fails startup when the feature is enabled.

For the selected development branch, run:

```sh
node --import tsx --env-file-if-exists=.env scripts/database.ts sandbox-mode <tenant> <branch> true
npm start
```

This turns off pay at pickup for new orders in that branch. Existing confirmed orders keep their original method, prices and fulfillment. Disable sandbox mode with the same command ending in `false`; this does not convert existing orders to cash or cancel an uncertain payment.

## Rehearse the flow

Confirm a synthetic cart in Spanish or English. The order remains unpaid and cannot use simulation-pay, cash recording or unpaid kitchen acceptance. An owner/operator uses **Issue sandbox checkout link** in the panel. The server persists one immutable attempt before calling the gateway; the browser receives an expiring opaque same-origin link, not provider authority. Treat the link as a private capability and share only with the assigned test customer. Reissuing a ready link invalidates the older link and reuses the same gateway transaction.

The handoff page labels the transaction as a test and submits `token_ws` by POST to the exact integration destination. Only that response permits the integration origin in its form CSP. A browser return or cancellation cannot supply the amount, order, merchant or authorization result. The server claims a commit once and checks the authoritative response against the saved merchant, CLP total, buy order and session. Verified test authorization moves one local ticket to preparation, without a POS reference or real-money revenue. Staff then marks ready and confirms test pickup.

Use **Reconcile sandbox status** after a timeout or interruption. Reconciliation performs a status lookup, never another commit, checkout creation or refund. An abandoned creation with no known provider token is shown as needing review; it cannot silently create another transaction. Link expiry does not erase a late authoritative payment result. A declined, cancelled, reversed or uncertain observation cannot turn into a cash payment automatically.

## Full test reversals and exceptions

An owner can explicitly reverse a full test authorization before collection. The server rechecks the current role, revision, immutable amount and prior reversal claim inside the branch transaction. An operator/viewer cannot reverse. The action is claimed before external I/O and is never automatically retried. Collection and readiness are blocked while the reversal needs review. Authoritative reversed/nullified evidence records `sandbox_reversed` while retaining the ticket and audit trail. Partial reversals and production refunds are unsupported.

If a reversal times out, an `AUTHORIZED` status by itself does not prove that reversal failed: the order remains `sandbox_review`, and another reversal is prohibited. Reconcile and use the approved provider support process. Never manually edit rows, fabricate success, restart a payment or switch to cash to clear the exception. Refunds after collection need a separate reviewed operational design.

## Evidence and gates

`npm test` covers the transport against local mock HTTP responses. `npm run test:db` uses isolated schemas and a fake gateway for scoped access, duplicate/concurrent returns, a single kitchen ticket, restart/status reconciliation, stale leases, mismatched totals/merchant, expired links, owner reversal and unknown-outcome handling. These checks do not prove hosted checkout, a real card authorization, refund acceptance, settlement or restaurant sign-off. Actual sandbox/browser return testing needs approved HTTPS hosting and runtime network access; production merchant onboarding remains a separate gate.

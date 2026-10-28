# Pending GitHub delivery evidence

28 October 2026. These are pending issue comments, not published GitHub updates. Public issue pages remain readable, but REST and GraphQL requests were denied by the runtime proxy. Apply only after API access is restored and link the resulting delivery commit/PR. Preserve unchecked external acceptance criteria.

## Issue #10: durable WhatsApp delivery

Migration 005 and scoped staff recovery add a redacted exception list, audited known-failure retry, and explicit review of uncertain sends without resending. Six recovery TAP results cover authorization, tenant isolation, races, replay and conversation unblocking. Resolution does not assert delivery. Provider callbacks, retention policy and real-phone acceptance remain open.

## Issue #14: hosted checkout

Sandbox-only adapter boundary follows the official Transbank Node SDK contract at 52ad60075ce7d9eacf7f8cc42a795ae43bd483ff. Five local mock HTTP tests cover create/commit/status, authoritative identity/amount checks, declines and redacted ambiguous failures. The adapter is initially disconnected from application checkout. This is not evidence of a real hosted sandbox transaction or production settlement.

## Issues #18, #20, #21 and #27: rehearsal and operations

Run `node --import tsx scripts/rehearse-demo.ts` from the checkout. It starts isolated real HTTP demo processes and exercises Spanish/English ordering, replay, authentication and collection across local pay at pickup and both simulated POS labels. `docs/operations-rehearsal.md` supplies the browser checklist, redacted customer feedback template and staging/rollback/privacy gates. No restaurant approval, browser accessibility sign-off, real WhatsApp transport, sandbox payment, paid hosting or vendor kitchen acceptance is claimed.

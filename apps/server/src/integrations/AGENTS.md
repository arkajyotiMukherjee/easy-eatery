# Provider contracts and WhatsApp I/O

`contracts.ts` defines `PaymentProvider`, `PosProvider`, `WhatsAppTransport` and labeled demo payment/POS implementations. `whatsapp.ts` owns `CloudWhatsAppTransport`, raw-body `validSignature` HMAC checks and account-filtered `parseMessages` normalization. Query those symbols for callers.

Keep external request/response shapes out of shared domain rules. Cloud WhatsApp transport is real outbound I/O; payment/POS contracts currently use simulated implementations. Toteat and Fudo access and kitchen workflow gates are documented in `docs/integrations.md`; one branch uses one selected provider per order. A local fake reference or idempotency Map does not establish real financial settlement or provider exactly-once behavior.

Preserve constant-time signature verification, receiving phone-ID filtering, bounded message parsing and non-leaking error handling. Never log tokens, credential URLs, raw customer messages or checkout links. Use fake transports in tests; do not send actual messages for validation. Run `npm run check` and `npm test`; routing and restart changes also need database tests.

`webpay.ts` implements sandbox-only create/commit/status/full-reversal transport against the official Transbank Node SDK contract at `52ad60075ce7d9eacf7f8cc42a795ae43bd483ff`. `persistence/sandbox-payments.ts` owns durable authority and `sandbox-routes.ts` owns the guest POST handoff. Fixed integration origin, immutable merchant/CLP/order/session verification and no automatic unknown-outcome retry are mandatory. Sandbox authorization is not settlement/revenue; real hosted acceptance is unverified. See `docs/webpay-sandbox.md`.

`whatsapp.ts` normalizes bounded inbound timestamps and signed status events, never raw provider errors. `customerWindowOpen` reserves the transport timeout within the verified 24-hour window; missing/future/stale timestamps cannot open it. Status evidence never authorizes queue retries, payment or kitchen transitions.

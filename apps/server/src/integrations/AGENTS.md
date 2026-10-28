# Provider contracts and WhatsApp I/O

`contracts.ts` defines `PaymentProvider`, `PosProvider`, `WhatsAppTransport` and labeled demo payment/POS implementations. `whatsapp.ts` owns `CloudWhatsAppTransport`, raw-body `validSignature` HMAC checks and account-filtered `parseMessages` normalization. Query those symbols for callers.

Keep external request/response shapes out of shared domain rules. Cloud WhatsApp transport is real outbound I/O; payment/POS contracts currently use simulated implementations. Toteat and Fudo access and kitchen workflow gates are documented in `docs/integrations.md`; one branch uses one selected provider per order. A local fake reference or idempotency Map does not establish real financial settlement or provider exactly-once behavior.

Preserve constant-time signature verification, receiving phone-ID filtering, bounded message parsing and non-leaking error handling. Never log tokens, credential URLs, raw customer messages or checkout links. Use fake transports in tests; do not send actual messages for validation. Run `npm run check` and `npm test`; routing and restart changes also need database tests.

# Chile Payment Integrations — Webpay Plus & Mercado Pago

## 1. Product decision

Keep a provider-neutral payment abstraction. A first customer can start with pay-at-pickup if that is accepted by the restaurant; otherwise ship one online payment provider only. For Chile, shortlist:

1. **Transbank Webpay Plus** for a Chile-local hosted card-payment flow and direct integration.
2. **Mercado Pago Checkout Pro Orders** for a hosted checkout/payment-link flow that can work across website and WhatsApp.

Do not build two complete providers before first customer demand. Select the first based on restaurant merchant account readiness, sales/channel needs, fees, payment methods and integration test access.

Official docs:
- Transbank Webpay Plus reference: <https://github.com/TransbankDevelopers/transbank-developers-docs/blob/master/referencia/webpay/README.md>
- Transbank merchant activation: <https://ayuda.transbank.cl/activar-webpay-plus>
- Mercado Pago Chile Checkout Pro Orders overview: <https://www.mercadopago.cl/developers/es/reference/online-payments/checkout-pro-orders/overview>
- Mercado Pago create order: <https://www.mercadopago.cl/developers/es/reference/online-payments/checkout-pro/create-order/post>

## 2. Shared payment domain

- `payment_providers` identifies provider adapter and platform/tenant account model.
- `payment_connections` stores tenant/branch mapping and Secret Manager refs.
- `payment_attempts` records internal order, amount/currency, idempotency key, provider reference, checkout URL, status and provider timestamps.
- `payment_events`/`payment_webhook_inbox` deduplicates and records provider events.
- `refunds` records original provider payment and amount/reason/status.
- `reconciliation_items` tracks mismatch or unknown status.

Keep platform SaaS subscription charges separate from restaurant customer-order payments. For the first customer, prefer restaurant-owned merchant accounts/direct provider authorization so restaurant funds settle directly with merchant unless a payments/legal review explicitly approves a different model. Do not pool/hold restaurant funds yourself without legal/commercial review.

## 3. Payment adapter interface

```ts
interface PaymentAdapter {
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>;
  verifyWebhook(input: ProviderWebhookRequest): Promise<VerifiedPaymentEvent>;
  getPaymentStatus(input: GetPaymentStatusInput): Promise<NormalizedPaymentStatus>;
  requestRefund?(input: RefundInput): Promise<RefundResult>;
  createPaymentLink?(input: CreatePaymentLinkInput): Promise<PaymentLinkResult>;
}
```

Adapter normalizes statuses. It must keep provider reference, transaction amount, currency and event ID. Every create attempt uses provider-supported idempotency where documented. Provider credentials never reach the client.

## 4. Transbank Webpay Plus flow

The official reference documents merchant authentication headers `Tbk-Api-Key-Id` (commerce code) and `Tbk-Api-Key-Secret`, distinct integration/production credentials, and a transaction create operation that returns a unique transaction token. Official base hosts documented there include integration `https://webpay3gint.transbank.cl` and production `https://webpay3g.transbank.cl`; always prefer maintained official SDK and current docs over hand-built URLs.

Implementation outline:
1. Merchant obtains and activates Webpay Plus credentials; validate integration vs production credentials.
2. Backend validates order total and creates `payment_attempt` in pending state.
3. Call official SDK transaction create with unique `buy_order` (within provider length/character rules), internal session ID, amount in CLP and return URL.
4. Store provider token/reference and redirect customer to provider-hosted flow.
5. Return handler receives provider token/result; do not trust URL parameters as final proof. Use documented commit/status transaction operation to verify outcome.
6. Commit verified payment state transactionally and emit `payment.succeeded` or failure event.
7. Reconcile pending/unknown attempts and handle duplicate return/webhook calls idempotently.

Use SDK integration environment and test credentials in staging. The owner/customer must complete merchant onboarding and provider's integration validation before production. Never embed `Tbk-Api-Key-Secret` in the frontend.

## 5. Mercado Pago Checkout Pro Orders flow

The current Mercado Pago Chile docs label Orders API as the recommended new Checkout Pro integration path; older Preferences API is a legacy-compatible path, with new features intended for Orders.

Implementation outline:
1. Merchant authorizes/creates appropriate Mercado Pago account/application credentials.
2. Backend builds an order payload using the authoritative CLP total and order reference.
3. Send `POST https://api.mercadopago.com/v1/orders` with `Authorization: Bearer ...` and documented `X-Idempotency-Key`.
4. Store returned order ID and `checkout_url`, then redirect or send the hosted link.
5. Configure documented payment/order notifications; verify events using the current provider authentication/signature mechanism and query provider state if needed.
6. Normalize status; only verified successful status marks paid.
7. Reconcile delayed/duplicate/out-of-order provider notifications and refunds.

For WhatsApp, send only a backend-generated hosted checkout URL associated with a specific order; never accept a user-provided “I paid” message as confirmation.

## 6. Webhook contract

- Public HTTPS endpoint identifies provider and tenant connection through a nonsecret route identifier/lookup; verify provider signature/authentication per current docs.
- Persist inbox record idempotently before acknowledging.
- Enqueue state update and respond quickly (2xx per provider spec).
- Validate payment reference, expected order, amount and currency; if mismatch, mark `needs_review`, do not mark order paid.
- Store minimal/redacted payload and retain according to compliance policy.

## 7. Retry and reconciliation rules

- Retry transient timeouts with the same idempotency key when provider supports it.
- On ambiguous timeout where provider outcome is unknown, query by reference before recreating.
- Payment state is monotonic except audited refund/reversal paths; late success after local cancellation enters explicit compensation/manual review.
- Scheduled reconciliation checks pending/unknown payment attempts and provider totals.
- Staff view shows “pending verification” instead of false paid/unpaid certainty.

## 8. Country-specific choices

- Use CLP as integer pesos (provider schemas may constrain amount type; validate SDK behavior).
- Have local accounting/tax counsel determine VAT display and receipt/invoice obligations. Payment-provider approval is not equivalent to SII fiscal-document integration.
- No raw card data, CVV or full PAN in database/logs.
- Display all additional fees/charges transparently and ensure restaurant controls final price.

## 9. Acceptance criteria

- Browser return alone cannot mark paid.
- Duplicate provider event does not duplicate payment/order/reward.
- Amount mismatch is held for review.
- Provider secret rotation is testable without redeployment of source code.
- Pay-at-pickup works if online provider not enabled, with clear UI and policy.
- POS order handoff failure is visible and reconciled independently from payment state.

# Chile POS Integration Strategy — Toteat and Fudo

**Status:** Research baseline verified 2026-10-15. Provider capabilities must be rechecked when implementation starts. API access should be requested immediately after a design partner is selected; provider approval may take longer than coding.

## 1. Do not pretend market share is known

No independent, reliable public dataset found in this research establishes the most-used restaurant POS specifically in Chile. Vendor-reported figures are not directly comparable: Fudo markets 35,000+ businesses across Latin America; Toteat markets 5,000+ customers across the Americas. These are self-reported, multi-country figures, not Chile market shares.

**Product decision:** Build a provider-neutral connector interface. For actual implementation, prioritize the POS already used by the first contracted restaurant, provided the owner can authorize access. If both are available, Toteat is the first API prototype candidate because its public docs explicitly cover external order creation, product/menu retrieval, order status, sales/reporting and webhooks. Fudo is a strong second candidate due to broad regional footprint, but its external-order integration requires approval. Do not advertise either as universally supported until certified against multiple tenant accounts/plan tiers.

Sources: [Toteat API](https://developers.toteat.com/), [Toteat Chile](https://toteat.com/es-cl/), [Fudo Chile](https://fu.do/es-cl/), [Fudo general API](https://soporte.fu.do/es/articles/11939789-api-publica-de-proposito-general), [Fudo external-order integration](https://soporte.fu.do/es/articles/15707531-integracion-de-pedidos-externos-via-apis).

## 2. Connector capability model

Each tenant/branch connection records capabilities independently:

- `catalog.read`
- `sales.read`
- `sales.details.read`
- `sales.events.receive`
- `orders.create_external`
- `orders.status.read`
- `orders.status.events.receive`
- `customers.read`
- `inventory.read`
- `discounts.apply`
- `refunds.read`
- `fiscal_documents.read`

Capability values: `supported`, `unsupported`, `approval_required`, `plan_required`, `not_tested`, `temporarily_unavailable`. Admin dashboard must show capability statuses. A connector being “connected” does not mean all features are supported.

## 3. Toteat public API findings

Official portal: <https://developers.toteat.com/>. The documentation says:
- Production base URL: `https://api.toteat.com/mw/or/1.0/`
- Development base URL: `https://apidev.toteat.com/mw/or/1.0/`
- Credentials are enabled by the restaurant owner in `Configuración > Print Server & API > API Config`; token can be refreshed, invalidating old token.
- Requests are JSON; restaurant/local/user identifiers and `xapitoken` are required query parameters for the documented endpoints.
- Available surface includes retrieving menu/products, sales for periods, daily collection, external order creation, shift status, open/specific order status, inventory/accounting reports, available tables, cancelled orders, documents, and webhooks for order/shift/menu changes.
- General limit reported: 10 requests/second; specific endpoints have lower limits (e.g. shift status docs show 3 requests/minute). Follow per-endpoint limit in current OpenAPI spec.
- Webhook receiver must use HTTPS, acknowledge HTTP 200, and respond within 3 seconds; process work asynchronously. Webhook availability/payload fields can differ for legacy vs migrated environments.

### Important Toteat endpoints (verify exact schema in current OpenAPI before coding)

| Operation | Documented operation | Notes |
|---|---|---|
| Menu/products | `GET /products` | Source menu/price should be treated as authoritative if restaurant chooses POS source-of-truth |
| Create external order | `POST /orders` | Request includes restaurant/local IDs, external `orderReference`, order type/channel, status, document/lines; sync product codes and modifiers beforehand |
| Order status | `GET /orderstatus` | `ic` identifies a specific order; `listing` lists open orders; `det` controls detail |
| Shift status | `GET /shiftstatus` | Low documented limit; don't poll frequently |
| Webhook updates | configured callback URL | Events can include status/menu/shift changes; acknowledge quickly and queue work |
| Sales/reporting | listed in API docs | Use for reconciliation and CRM import; confirm date-window limits and identifiers from OpenAPI |

The public docs show parameters such as `xir`, `xil`, `xiu`, and `xapitoken`; these map to restaurant ID, local/branch number, user ID and API token. Do not put tokens in logs or browser code. Exact query schema and endpoints can differ across legacy/migrated configurations; download and version the current OpenAPI document in the implementation repository after authorized access.

### Toteat order integration sequence

1. Owner creates API integration in Toteat and enables the minimum required endpoints/permissions.
2. Store token and provider IDs in Secret Manager; store only the secret reference and nonsecret connection metadata in DB.
3. Fetch menu/products; map provider product code and modifiers to local catalog. Detect unmapped/inactive products.
4. Confirm open shift and branch readiness using appropriate rate limits.
5. Translate internal order into Toteat order schema. Keep the platform order ID in `orderReference`; map pickup/takeaway type and webstore channel correctly.
6. Submit once with a stable idempotency key in local DB. If provider lacks idempotency support, do not blindly retry after ambiguous timeout; query provider by external reference/status first.
7. Store Toteat order ID and accepted response. Receive configured webhook or poll order status within provider limits.
8. Map provider status to internal lifecycle without allowing backward/unknown status to overwrite terminal states without reconciliation.
9. Reconcile daily sales/order totals and report mismatches.

### Toteat webhook receiver

- `POST /api/v1/webhooks/pos/toteat/:connectionPublicId` on HTTPS.
- Validate configured authentication header/signature if provider supports it; if not, use unguessable route token, network/provider constraints where available, strict schema validation, rate limiting and replay defenses.
- Persist redacted payload + delivery ID/time before HTTP 200. Acknowledge within 3 seconds.
- Worker validates tenant mapping and deduplicates. Unknown/unmapped event is stored and alerts operator.
- Do not assume webhook contains every order from the POS: docs indicate order webhook scope may be orders created through the configured API unless provider enables a global webhook. Confirm whether “all POS sales” can be subscribed to.

## 4. Fudo public API findings

Official help page: <https://soporte.fu.do/es/articles/11939789-api-publica-de-proposito-general>.
- Public general API is listed as available on Fudo Plan Pro.
- Owner enables it under `Aplicaciones externas > API Pública General`.
- Create a dedicated least-privilege API user under `Administración > Usuarios`; API Key and API Secret are generated there.
- Credentials/token described in the help page expire after 24 hours by default; follow current official API auth/renewal spec. Missing secret must be regenerated.
- Exposed resources include customers, discounts, expenses, ingredients, kitchens, payments, orders, products, suppliers, sales, tables, users and related data.
- Official technical documentation: <https://dev.fu.do/api/> (OpenAPI 3 per Fudo help page).

External order creation is a separate integration path: <https://soporte.fu.do/es/articles/15707531-integracion-de-pedidos-externos-via-apis>. Fudo states it is an exception subject to approval, requires an active account and detailed use case, may take up to one month for a response, and creates a link with Client ID/Client Secret. Events include order rejected/confirmed/ready-to-deliver/delivery-sent/closed. The public API's read access does not imply that external order creation is approved.

### Fudo implementation gate

Before production scope commitment, the restaurant and Fudo must confirm:
- Plan Pro status and API access.
- Auth/refresh operation and exact endpoint contracts from current OpenAPI.
- Permitted sales/customer fields and request limits.
- Whether external order creation is approved and which event callback/auth scheme is supported.
- Whether the integration overlaps with Fudo's own products and any terms constrain an external storefront.

Do not invent a Fudo route or auth flow: obtain the OpenAPI specification from `https://dev.fu.do/api/` with authorized credentials and use its exact request/response schemas.

## 5. Normalized internal model

`NormalizedSale` fields:
- `tenantId`, `branchId`, `providerKey`, `externalSaleId`, `externalOrderId?`, `occurredAt`, `closedAt?`, `currency`, `grossMinor`, `discountMinor`, `taxMinor?`, `tipMinor?`, `netEligibleMinor?`, `status`, `refundOfExternalSaleId?`, `customerExternalId?`, `items[]`, `rawReference`, `syncRunId`.

Store original payload only if necessary, redacted/minimized with retention. Keep provider amounts separate until finance/accountant confirms which subtotal is eligible for loyalty and RFM.

## 6. Shared `PosAdapter` contract

```ts
interface PosAdapter {
  testConnection(input: ConnectionConfig): Promise<ConnectionTestResult>;
  getCapabilities(input: ConnectionConfig): Promise<PosCapabilityMap>;
  fetchProducts(input: ConnectionConfig, cursor?: string): Promise<Page<NormalizedProduct>>;
  fetchSales(input: ConnectionConfig, range: DateRange, cursor?: string): Promise<Page<NormalizedSale>>;
  createExternalOrder?(input: ConnectionConfig, order: PosOrderPayload): Promise<PosOrderResult>;
  getOrderStatus?(input: ConnectionConfig, externalOrderId: string): Promise<NormalizedPosOrderStatus>;
  verifyWebhook?(request: PosWebhookRequest): Promise<NormalizedPosEvent>;
}
```

Optional methods are absent if unsupported; do not implement as fake success. Feature module checks recorded capability before calling method.

## 7. Sync safety

- Use per-connection sync cursors and overlap windows to handle late-arriving updates.
- Deduplicate on `(tenant_id, provider, external_event_id)` or provider object ID + version/timestamp where no event ID exists.
- Import updates are idempotent; preserve deleted/inactive products as inactive rather than deleting historical references.
- Avoid full-period re-import each time; paginate and use modified timestamps where available.
- Provider rate limits belong in adapter config; schedule jobs with per-connection concurrency control.
- Fail closed on schema changes and emit metrics; don't silently discard unknown required fields.

## 8. Certification checklist before listing a provider as supported

- Live connection created by restaurant owner, credentials stored safely, rotation tested.
- Test data covers open/closed shift, product modifier, cancelled order, sale/refund, missing customer, duplicate event and timeout.
- Create order exactly once despite worker retry/ambiguous network failure.
- Order statuses correctly mapped; terminal transitions reconciled.
- Provider API outage produces alert and safe retry.
- Sales total reconciles against the POS UI/report for selected date range.
- Written matrix of feature/plan/permission requirements provided to sales/support.

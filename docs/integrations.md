# Integration decisions and test setup

Research checked 28 October 2026. Public documentation establishes a possible integration surface; it does not grant access to a restaurant or prove its kitchen workflow. Both **Toteat and Fudo are required for the initial pilot**, using a separate configured provider per restaurant/branch. Never send one order to both.

## Capability matrix

| Capability | Toteat | Fudo | Current code |
| --- | --- | --- | --- |
| Catalog access | Public API documents products | General API documents product data; access conditions apply | Bilingual seeded catalog |
| External order injection | Public order-creation contract | Separate approved external-order integration | Simulated adapter only |
| Kitchen acceptance/readiness | Verify statuses, shift and webhook behavior against pilot account | Verify external-order events and actual Delivery/kitchen behavior | Staff advances simulated states |
| API-generated hosted payment link | Not established by inspected public order API | Not established by inspected help documentation | No real checkout; panel simulation |
| Commercial/access gate | Owner enables API and supplies account-specific configuration | External-order approval and required Delivery module | No real credentials configured |

### Toteat

The [official API index](https://developers.toteat.com/toteatApi_v2.yaml) lists products, order creation, order status, shift status and event hooks. Its descriptive guidance recommends `https://api.toteat.com/mw/or/1.0/` for production and `https://apidev.toteat.com/mw/or/1.0/` for development; its `servers` entry still contains an older URL. Confirm the usable base with the actual account rather than generating a client from that entry without review.

The [configuration guide](https://developers.toteat.com/tags/config_tag.yaml) describes owner-enabled API access with token, restaurant, local and user identifiers. The [order contract](https://developers.toteat.com/paths/create_order.yaml) documents `POST /orders`, query credentials (`xir`, `xil`, `xiu`, `xapitoken`), payment data and a precondition to check an open shift. Avoid logging credential-bearing URLs. Keep product/modifier and payment-method mappings specific to the account.

**Inference:** recording payment data on an injected order does not prove that a checkout link can be generated or that money has moved. The public paths inspected did not establish that capability. Verify it with Toteat before committing to POS-hosted checkout. Confirm pickup semantics, duplicate handling, uncertain-outcome lookup and actual KDS/printer behavior using the restaurant account. Track implementation in [#13](https://github.com/arkajyotiMukherjee/easy-eatery/issues/13).

### Fudo

[Fudo's external-order guide](https://soporte.fu.do/es/articles/15707531-integracion-de-pedidos-externos-via-apis) makes this integration subject to approval, indicates approval can take up to one month, and requires its Delivery module for externally created pickup/delivery orders. This route does not insert orders into Mesas y Mostrador. The restaurant must validate that workflow.

The [general API guide](https://soporte.fu.do/es/articles/11939789-api-publica-de-proposito-general) describes Pro-plan access for business data. That is separate from external-order approval. Do not substitute generic sale/order APIs for an approved external-order contract. Obtain the authorized technical documentation, credentials and redacted fixtures before writing the adapter. Payment-link availability remains a feasibility question. Track the adapter in [#22](https://github.com/arkajyotiMukherjee/easy-eatery/issues/22).

## Hosted checkout gate

[#3](https://github.com/arkajyotiMukherjee/easy-eatery/issues/3) must establish the supported payment flow for **each POS**: checkout creation, merchant settlement, expiry, authenticated callbacks/status lookup and refund support. The restaurant should receive settlement. If either POS has no suitable API, record an owner-approved separate gateway such as Webpay or Mercado Pago and map its verified settlement into the POS. This is a proposed alternative, not a connected integration.

Confirm payment before submitting the paid pickup; keep paid and kitchen-accepted states separate. Only verified server-side payment evidence authorizes the real POS submission. The current `/api/demo/orders/:id/pay` is an authenticated simulation control and must not exist as a real financial authorization path. Production adapters and a mode gate are backlog work.

## WhatsApp test-account setup

Use **Meta WhatsApp Business Platform Cloud API**, rather than relying on the mobile WhatsApp Business app. The [official Meta collection](https://www.postman.com/meta/whatsapp-business-platform/overview) and its [webhook guide](https://www.postman.com/meta/whatsapp-business-platform/folder/lboq68h/webhooks) are reference entry points. Some Meta documentation requires login; confirm current app-specific setup, supported Graph version, recipient restrictions and messaging rules in the developer console.

1. The account owner creates/configures the business app and test sender. Add and verify the permitted test recipients shown by Meta. Do not put personal contact details in GitHub issues.
2. Obtain the app secret, sender phone-number ID, access token and an explicitly supported Graph API version. Create a separate random webhook verification token.
3. Set `WHATSAPP_TRANSPORT=cloud` and the `WHATSAPP_*` variables in an ignored local `.env`. The process fails closed on missing Cloud credentials. Keep `POS_PROVIDER=toteat` or `fudo`; **both remain simulated** in this scaffold.
4. Expose the test server through an approved HTTPS development endpoint. Configure `/webhooks/whatsapp` as callback, complete the challenge, and subscribe the app/account to messages as required by Meta.
5. The current single-tenant demo maps only `WHATSAPP_PHONE_NUMBER_ID`; other receiving IDs are ignored. The route verifies `X-Hub-Signature-256` over raw body bytes and processes batched messages. Status-only notifications do not start conversations.
6. Send `hola` from a permitted recipient, then select items and `confirmar`. Send `English` to switch the conversation language, then use `menu`, `cart`, `confirm`, `remove 1`, `clear` and `new`. Send `Español` to switch back. The session retains its cart.
7. The outbound reply includes an explicitly simulated payment reference, not a payable URL. Open the authenticated panel and simulate payment there. A supported real hosted URL is M3 work.

Only immediate replies to permitted test-recipient input are scaffolded. Production readiness notifications need messaging-window checks, approved templates when required, delivery statuses, retries and human handoff (#10/#12). The in-memory webhook process is not restart-safe and does not provide durable outbox guarantees. Avoid connecting real customer traffic until M2/M3 gates are complete.

## Provider parity gate

[#23](https://github.com/arkajyotiMukherjee/easy-eatery/issues/23) must run the same domain acceptance cases against **both** providers. Store the chosen provider on each immutable order; a later account setting change must not redirect it. Keep per-tenant credentials and provider references isolated. Demonstrate actual acceptance and readiness using two sandbox restaurant configurations. A mock passing twice is not evidence that either vendor accepted an order.

Do not contact vendors or send restaurant data until the owner authorizes that communication. This setup creates tasks and documents requirements; it does not request API approval, accept provider terms, create merchant accounts or move money.

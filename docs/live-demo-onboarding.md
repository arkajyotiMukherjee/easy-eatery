# Live-demo onboarding plan

Cloud implementation update: optional [staff-assisted Webpay sandbox](webpay-sandbox.md) and [durable staff handoff/notifications](whatsapp-support.md) now have local fixture coverage. Default payment/POS adapters remain simulated; actual sandbox, real-phone, restaurant/vendor and production-hosting acceptance remain unverified. Historical scaffold descriptions below are not acceptance evidence.

Updated 28 October 2026 after founder clarification. The account owner business is **Arkaive Studio**. Registration email was supplied privately in the conversation and is intentionally omitted from this public repository document. At initial planning, the founder had only the WhatsApp Business mobile app and no Meta Cloud API assets or restaurant POS accounts. Meta developer enrollment, Arkaive Studio portfolio, the Easy Eatery app and a test sender were subsequently created; MCP OAuth succeeded. Recipient/webhook acceptance and messaging remain unverified. Business verification is deferred while company registration is pending.

**The first prospect demo does not require a POS.** It will use real WhatsApp, Easy Eatery's own staff kitchen/pickup dashboard, and pay at pickup. Add an independent Webpay Plus sandbox checkout to demonstrate the full payment journey when the sandbox connection is verified. Both Toteat and Fudo remain planned integrations for the subsequent restaurant pilot; neither is a prerequisite for this prospect demo. Configure one fulfillment destination per branch/order and never submit one order to both providers.

## 1. Recommended route

Use Meta WhatsApp Cloud API directly for the first real-phone demo: the repository already contains its signed ingress and text transport. Twilio is an optional alternative that needs its own transport, webhook parser/signature validation and configuration. Do not create/pay for both routes merely to get started.

Use a test sender and enrolled recipients initially. Your existing WhatsApp Business app/number can remain unchanged and your phone can be a test recipient. No Twilio account is needed for the recommended direct-Meta route. Use synthetic restaurant/menu data until a restaurant partner approves its own data. Obtain actual Toteat/Fudo integration access after a pilot partner is available; a generic developer signup is not equivalent to an API-enabled restaurant environment.

There are three distinct deliverables:

| Deliverable | What is real | What is still needed |
| --- | --- | --- |
| POS-independent prospect demo | WhatsApp conversation, menu, persisted order, local kitchen dashboard, pay at pickup | Meta test assets, approved recipients, public HTTPS webhook, durable order processing and explicit local-fulfillment mode |
| Full payment prospect demo | Everything above plus provider-hosted Webpay sandbox and verified test-payment result | Reachable integration environment, checkout/commit/status adapter, callback route and failure tests; no restaurant POS account required |
| Limited live restaurant pilot | Registered restaurant sender, real settlement, actual kitchen/pickup operations | Merchant/provider/sender approvals, operational ownership, production configuration and acceptance |

Tokens do not finish the implementation automatically: the current POS and payment adapters are simulated. State/retry workers, local fulfillment, pay-at-pickup handling, real checkout and reconciliation still need engineering work. The existing browser simulator is not evidence of real-phone or Webpay acceptance.

## 2. What you provide first—without secrets in chat

| Needed from the founder | When | How |
| --- | --- | --- |
| Sign in to Meta/Facebook and complete developer enrollment if requested | Now | Use the opened Meta browser tab; password, OTP, CAPTCHA and terms stay under owner control |
| Verify the phone used as a permitted test recipient | Meta setup | Enter the verification code on Meta's page; the phone can use ordinary WhatsApp or the Business mobile app |
| Choose hosting/project access and a spending cap | Before paid provisioning | A supervised temporary HTTPS tunnel can prove webhooks first; stable staging is required for an unattended demo |
| Test the customer flow in English | After transport is connected | Send a greeting, switch to English, select items, confirm, open checkout or choose pay at pickup |
| Restaurant introduction, approved menu and owner-authorized POS access | After prospect demo | Needed for genuine kitchen routing through Toteat/Fudo and real restaurant operations |
| Restaurant merchant/settlement details | Before collecting real money | Not needed for the proposed shared-credential Webpay sandbox; production onboarding remains separate |

No Chilean tax identity, bank account, restaurant subscription or live card is needed for the proposed first demo. If a provider actually requests additional identity information, review that requirement rather than inventing restaurant details. Business name and registration email alone cannot create a verified Meta identity.

Passwords, API secrets, payment credentials and OTPs do not belong in the repository, GitHub issues or chat. Sign in through the provider's browser page. Configure runtime secrets privately in ignored local environment files or a staging secret manager. We can verify presence/permissions without printing secret values.

## 3. Browser-assisted setup and staying in the loop

This session currently exposes the in-app browser, not Chrome. We can navigate Spanish pages, explain fields in English and prepare settings there after you sign in. If an approved Chrome connection is made available, it can work with existing signed-in tabs; bulk copying/exporting a Chrome profile, cookies or saved passwords is not the setup plan. See [official browser guidance](https://developers.openai.com/training/walkthroughs/using-your-computer-and-browser).

Account setup will be user-owned. We can fill non-binding fields with your supplied details, prepare configurations and verify results. You take over for new password entry and verification prompts as needed. Accepting terms, granting new sensitive permissions, changing a live sender/account and activating paid services must be surfaced at the actual step. Billing purchases and real financial transactions remain with you. Vendor messages can be drafted in Spanish; sending requires the recipient and text to be authorized.

At each meaningful account milestone, report the account/environment, completed setup, current blocker and next action in English. Capture progress without exposing secrets. Do not claim a provider integration works until its API response and restaurant-side result have been verified.

## 4. WhatsApp: account assets and the test journey

The mobile Business app is different from the API assets. Meta's [official Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api) describes a business portfolio, WABA and sender, plus user/system-user access tokens and messaging permissions. Some current Meta setup pages require login, so test-number availability and restrictions must be confirmed in your own console.

| Asset/configuration | Who supplies it |
| --- | --- |
| Meta login and business-asset administrator | You/the business owner |
| Developer app with WhatsApp use case | We help configure under your account |
| App ID, WABA ID, sender phone-number ID | Generated/located in Meta |
| App secret and suitable scoped access token | Generated through Meta; stored privately |
| Permitted test recipients | You/partner verify them in Meta and receive messages on their phones |
| Webhook verify token | We generate it and match it in Meta/application config |
| HTTPS callback and supported Graph version | We configure and verify |

Test sequence: a permitted phone sends a greeting to the test sender → Meta posts a signed event → our mapped branch loads its catalog → the app replies in Spanish/English → the customer selects and confirms items → a persisted order appears. For pay at pickup, staff accepts the order into the local kitchen queue while payment remains due. For Webpay sandbox, send the application checkout link, verify the test-payment result server-side, then enqueue local kitchen work. Staff marks ready/collected and the customer receives permitted notifications. Transport-only smoke tests may still use the existing simulator, explicitly labeled.

Your existing Business number is not required as the initial API sender. Do not deregister or migrate it just to test. If it is later intended as the live restaurant sender, inspect account eligibility, supported coexistence/migration and ownership implications before changing it. For onboarding other restaurants, confirm the applicable Meta review/permissions/onboarding requirements separately.

For longer-running staging, use an appropriate scoped system-user credential rather than relying on a temporary dashboard token. Recipient verification and sender ownership may require actions on your phone that browser automation cannot perform for you.

### Optional Twilio route

If direct Meta setup is blocked, evaluate Twilio's testing environment. Its [current quickstart](https://www.twilio.com/docs/whatsapp/quickstart) covers the trial flow; the [legacy Sandbox](https://www.twilio.com/docs/whatsapp/sandbox) uses a shared sender and recipient enrollment with a join code. An existing WhatsApp Business API sender is not needed for that Sandbox. Trial limits, billing and the console variant must be checked in the account. It is a test environment, not a customer deployment.

We would need a user-owned Twilio project, Account SID and appropriate API credentials, sender configuration, joined test recipients and inbound/status webhook settings. It requires additional adapter work; our Meta webhook route cannot simply be pointed at Twilio. The [customer-service window/template rules](https://www.twilio.com/docs/whatsapp/key-concepts) still apply; delayed pickup notifications need approved templates when outside the allowed window.

## 5. Toteat access

The [official configuration reference](https://developers.toteat.com/tags/config_tag.yaml) requires restaurant-owner API enablement and provides a token plus restaurant, local and user IDs. It describes the external-order setting and origin-channel configuration.

Request an authorized test branch or vendor-provided development account. Collect the environment/base URL, API token, restaurant/local/user IDs, permitted routes, origin channel, product/modifier identifiers, payment-method mapping and a way for staff to inspect a test order. Verify access to catalog, shift/status and external-order creation. Do not assume a public developer signup grants this environment.

The [API specification](https://developers.toteat.com/toteatApi_v2.yaml) documents order-related paths. Obtain a definite answer on hosted-checkout creation, duplicate/timeout lookup and actual kitchen routing. A test endpoint alone does not prove a test restaurant or printer/KDS configuration exists.

## 6. Fudo access

Fudo's [external-order guide](https://soporte.fu.do/es/articles/15707531-integracion-de-pedidos-externos-via-apis) requires an active account and approval, which it says can take up to a month. The Delivery module is required; externally created pickup orders use that workflow. Approved setup generates Client ID/Client Secret credentials.

Request this early. We need approval, authorized technical documentation, isolated test operations and credentials—not merely a trial login. Ask how catalog, pickup/payment mapping, status callbacks and kitchen acknowledgment work for that account.

Fudo's separate [general API](https://soporte.fu.do/es/articles/11939789-api-publica-de-proposito-general) is a Pro-plan data interface with its own key/secret setup. Confirm whether it is needed for catalog access alongside the approved integration before buying a plan or generating extra credentials. General access does not substitute for external-order approval.

## 7. Payments: prove the supported flow before choosing accounts

For the prospect demo, choose **Webpay Plus integration environment**, independently of Toteat/Fudo. The founder explicitly approved a test-payment demonstration without a POS. The [official runnable Node example](https://proyecto-ejemplo-node.transbankdevelopers.cl/webpay-plus) configures SDK-provided integration credentials; no new production merchant account is needed for that documented sandbox path. The [operations example](https://proyecto-ejemplo-node.transbankdevelopers.cl/api-reference/webpay-plus) describes authoritative status and reversal operations.

Verification on 28 October: an isolated transaction-creation probe using published integration credentials and synthetic order data received **HTTP 403 with an Incapsula security page** from the current development network, before an API JSON response. No checkout token or payment was obtained. This does not prove missing merchant access; sandbox connectivity must be resolved through a supported network/deployment or vendor guidance before claiming that the full flow works. Retain pay at pickup as the working fallback; do not bypass a security challenge or silently substitute a simulated approval.

Implementation sequence:

1. Server creates a payment attempt for the immutable order total, with unique buy-order/session references and sandbox environment recorded.
2. WhatsApp contains an opaque, expiring HTTPS application link. Its landing page submits `token_ws` by POST to the allowlisted Webpay sandbox URL returned by creation; a plain GET of the gateway URL does not implement the documented handoff.
3. The customer uses only Transbank's published test card/bank identity on the provider's page. Our app never collects card data.
4. The callback uses the saved token and server-side commit/status response to verify authorization, amount, order and session. Handle cancel, rejection, timeout and duplicate returns separately; a success-looking browser URL is not payment proof.
5. Store `sandbox_authorized` distinctly from real-money receipts and from pay-at-pickup amounts. Enqueue one local kitchen ticket. Show provider reference and fulfillment/payment states separately in the dashboard.

Pay-at-pickup is a separate explicit payment method: confirmation creates an unpaid order, staff acceptance permits preparation, and a scoped staff action can record payment at pickup with audit history. Preparation/readiness must never imply payment. Do not automatically change a failed/uncertain online payment into pay at pickup; get an explicit choice and reconcile the original attempt to avoid double collection.

For the later restaurant pilot:

Ask each POS whether its approved API creates a hosted checkout URL for an external pickup order, how payment is authoritatively verified and how refunds work. Public order payment fields are not evidence of link generation or actual settlement.

If POS-hosted checkout is supported, use the documented test contract. Otherwise, record approval for an independent Chile-supported sandbox gateway. [Transbank's official Webpay Plus example](https://proyecto-ejemplo-node.transbankdevelopers.cl/webpay-plus) uses provided integration credentials, returns a payment token and URL, and submits the token through a payment form. We can build our own opaque checkout link around that documented flow; it is not a POS-created link. Production merchant onboarding is separate.

Mercado Pago is another candidate. Its [integration dashboard](https://www.mercadopago.cl/developers/es/docs/your-integrations/introduction) distinguishes test/production setup; exact test credentials/account requirements depend on the chosen Checkout variant. Do not infer test/production solely from a token prefix. Select one gateway after confirming the restaurant's existing arrangement and the supported POS reconciliation path.

For a real-money pilot, the restaurant must supply the merchant authorization and whatever business/tax/settlement information the selected provider requires. Configure the intended settlement recipient explicitly; do not route restaurant receipts into a developer's personal account by default. Card details remain on the provider's hosted page.

## 8. Engineering execution and exit evidence

| Stage | Inputs needed | Work and exit evidence | Existing issues |
| --- | --- | --- | --- |
| Meta access and ownership | Founder login and recipient phone | Developer app/test sender and verified recipient; no restaurant POS prerequisite | #9 |
| POS-independent prospect demo | Synthetic menu and founder testing | Local kitchen mode, pay at pickup, separate payment/fulfillment ledger, bilingual dashboard | [#27](https://github.com/arkajyotiMukherjee/easy-eatery/issues/27) |
| Real WhatsApp transport | Meta assets, recipient verification, HTTPS endpoint | Actual greeting/menu/cart from your phone; verified signature/routing; redacted delivery evidence | #9 |
| Durable orchestration | Development access; no additional vendor account needed | Separate payment/fulfillment states, idempotent workers, retry/error visibility | #8/#10/#12 |
| POS adapters | Authorized Toteat/Fudo contracts and test credentials | Real catalog mapping; one test pickup accepted in each selected restaurant workflow; references/status proof | #7/#13/#22 |
| Hosted sandbox checkout | Webpay integration credentials and reachable sandbox | Test approval/failure/abandonment; authoritative amount/order/session verification; no simulated pay endpoint in sandbox mode | #14; local fulfillment tracked separately from #15's POS acceptance |
| Integrated rehearsal | Staff test window, menu approval, both provider configurations | WhatsApp → sandbox payment → one kitchen order → ready → pickup → reconciled dashboard | #16–#18/#21/#23 |
| Live pilot | Registered sender, merchant activation, cloud budget and operational owner | Restricted real traffic, actual settlement, recovery/refund runbook and restaurant sign-off | #19–#21 |

First complete the standalone prospect demo; then obtain a restaurant partner and start its owner-authorized access requests. Both-provider pilot acceptance remains later work. Provider waits are external; do not promise a fixed launch date before access is proven. Existing roadmap gates for actual restaurant/POS acceptance do not block the standalone demo.

Staging needs a stable HTTPS app/worker endpoint, PostgreSQL, secret storage and logs with redacted credentials/contacts. The existing architecture targets Santiago. A local tunnel can prove an early webhook with test data; an unattended customer demo needs hosted staging. We need your chosen cloud project/access and cost cap before resource creation.

Acceptance includes duplicate messages/callbacks, wrong payment totals, closed/sold-out state, expired checkout, POS timeout, late payment and paid-but-unaccepted recovery. A success redirect is not payment proof, and payment success is not kitchen acceptance. Record one provider reference and one restaurant-side acknowledgment for each test order, not merely our dashboard status.

## 9. Spanish support drafts—prepared, not sent

### Toteat

Asunto: Acceso de pruebas e integración de pedidos por WhatsApp — Easy Eatery

Hola, estamos desarrollando Easy Eatery para pedidos por WhatsApp con retiro en local en Chile. Contamos con autorización del restaurante [nombre/local]. Necesitamos confirmar el acceso a un ambiente de pruebas, la habilitación de órdenes externas y los permisos del API. ¿Pueden indicar los requisitos, credenciales y documentación para catálogo/modificadores, estado de turno, creación y seguimiento de pedidos y notificaciones? ¿Existe un API para generar un enlace de pago alojado? También necesitamos confirmar la conciliación de pagos externos y el comportamiento ante pedidos duplicados o timeouts. No activaremos pedidos reales sin coordinar una prueba con el restaurante. Gracias.

### Fudo

Asunto: Solicitud de evaluación de integración de pedidos externos — Easy Eatery

Hola, solicitamos evaluar una integración para el restaurante [cuenta/local], con autorización de [administrador]. Easy Eatery permite pedidos por WhatsApp con retiro en local; nuestro caso específico es [necesidad no cubierta por las soluciones actuales]. El desarrollo estará a cargo de [nombre/contacto]. Queremos confirmar la aprobación, el Módulo de Delivery y la disponibilidad de una cuenta o entorno de pruebas. ¿Qué documentación y credenciales necesitamos para catálogo/modificadores, pedidos de retiro pagados, eventos y confirmación en cocina? ¿Existe un API para enlaces de pago alojados o un flujo admitido con una pasarela externa? Gracias.

Before sending either draft, fill the placeholders and confirm the official recipient/support channel inside the authorized account. Do not send credentials in the request.

## 10. First handoff

Meta's developer entry redirected to the official Business Suite login. The founder needs a new Facebook owner account, and its registration form is now open in the in-app browser. Complete registration yourself, including new password, terms and verification, then tell the agent when signed in. We can inspect existing assets, prepare the app under Arkaive Studio, and guide recipient verification afterward. We have not created a developer account/app, generated a Meta token, subscribed to a paid service, migrated a live phone or contacted a vendor. Do not create Twilio, Toteat or Fudo accounts merely to satisfy a signup checklist.

The next engineering slice is durable state separation plus local kitchen/pay-at-pickup support; Webpay connectivity/adapter work and Meta setup can proceed independently. The first completed prospect-demo rehearsal must show actual phone messages, persisted order/restart recovery, truthful payment labels, one local kitchen ticket, ready/collected actions and reconciled counts, in English and Spanish. A subsequent sandbox rehearsal adds verified hosted payment. Real settlement and POS acceptance are separate later evidence.

## Implementation progress — local pay-at-pickup slice

The bilingual local kitchen/pay-at-pickup workflow is implemented with PostgreSQL migration 003, per-branch configuration, immutable order payment/fulfillment method, separate due/store-paid states, scoped accept/payment actions and audit/outbox persistence. See README for setup. A browser rehearsal completed one synthetic CLP 4,500 pickup and recovered it after server restart on port 3312. Checks: 15 application tests; 10 database subtests plus the parent passed. This does not complete the real-phone, notification, Webpay or POS criteria of #27. No legal business information was invented or submitted.

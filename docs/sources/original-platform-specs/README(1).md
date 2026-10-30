# Chile Restaurant Platform — Product & Engineering Specification Pack

**Status:** Discovery/specification baseline — October 15, 2026  
**Audience:** Two-person founding team, product/design partner, Codex/implementation agents  
**Initial market:** Chile  
**Goal:** Validate a high-value workflow with a real restaurant before building the complete platform.

This is a set of implementation-oriented Markdown specs, not a claim that every integration has already been approved or tested. Treat provider access, commercial permissions and undocumented behavior as validation gates. Do not silently invent provider API paths or assume production credentials exist.

## Start here

1. [`00-product-direction-and-milestones.md`](00-product-direction-and-milestones.md) — what to validate first, what not to build, value/complexity roadmap.
2. [`15-prebuild-customer-validation.md`](15-prebuild-customer-validation.md) — design prototypes, interview scripts, concierge pilot, first-client onboarding.
3. [`01-platform-architecture.md`](01-platform-architecture.md) — shared stack, modular monolith, boundaries and deployment model.
4. [`02-admin-dashboard-and-ux.md`](02-admin-dashboard-and-ux.md) — the restaurant owner's single control plane.
5. [`10-chile-integrations-pos.md`](10-chile-integrations-pos.md) and [`11-chile-payments.md`](11-chile-payments.md) — Chile-specific integration choices and explicit constraints.
6. Implement the module specs only after the customer-validation gate is passed.

## Document index

| File | Scope |
|---|---|
| `00-product-direction-and-milestones.md` | Product direction, first version, delivery milestones, prioritization |
| `01-platform-architecture.md` | Shared stack, monorepo, domain architecture, deployability |
| `02-admin-dashboard-and-ux.md` | Shared admin dashboard information architecture and flows |
| `03-design-system-and-frontend.md` | Shared frontend, visual system, Spanish/Chile localization |
| `04-module-qr-menu.md` | Optional digital QR menu |
| `05-module-pickup-ordering.md` | Pickup storefront, scheduling, checkout, kitchen workflow |
| `06-module-loyalty-and-pos.md` | Points ledger, Google Wallet, POS verification/redemption |
| `07-module-crm.md` | Customer profile, identity resolution, segments, RFM |
| `08-module-whatsapp.md` | WhatsApp ordering, campaigns, support, payment links |
| `09-module-catering.md` | Catering estimator, quote lifecycle, PDF and lead capture |
| `10-chile-integrations-pos.md` | Toteat and Fudo research, adapter contract, integration pilot plan |
| `11-chile-payments.md` | Transbank Webpay Plus and Mercado Pago payment adapters |
| `12-security-privacy-chile.md` | Security, privacy, consent, Chile-specific legal review items |
| `13-deployment-and-operations.md` | Google Cloud Santiago baseline, delivery pipeline, backups and operations |
| `14-billing-entitlements.md` | Module catalog, subscriptions, tenant entitlements and usage metering |
| `15-prebuild-customer-validation.md` | Prototype-first sales/validation process and concierge pilot |
| `16-shared-domain-and-event-contracts.md` | Shared entities, event outbox, public/internal API guidelines |
| `17-testing-and-acceptance.md` | Definition of done, test pyramid, end-to-end acceptance criteria |

## Non-negotiable product principles

- Every commercial module can be enabled or disabled independently, subject only to declared shared-capability dependencies.
- Shared capabilities such as menu catalog, customer identity and order management are not automatically separate line items on the restaurant's bill.
- QR menu is optional. Pickup ordering, WhatsApp ordering, CRM and catering must not require QR menu to be enabled.
- One tenant may have multiple branches, different service entitlements per branch, and different POS connections per branch.
- PostgreSQL is the source of truth for orders, payment state, customer identity, loyalty ledger and entitlements.
- Third-party side effects run asynchronously when possible and are retried idempotently.
- Provider webhooks and browser redirects are not trusted as payment proof without verification.
- Do not build microservices, Kubernetes, Kafka, a graph database, or a second real-time database for the MVP.
- Never state that a POS connector is supported until access, capabilities, limits, and failure/recovery behavior are validated with a real account.
- Restaurant-facing UI defaults to Spanish (Chile), CLP, `America/Santiago`, metric quantities and Chilean phone formatting; timezone must use IANA rules rather than a fixed UTC offset.

## Research caveat

Public vendor pages do not establish an independently audited POS market share for Chile. Fudo markets 35,000+ businesses across Latin America; Toteat markets 5,000+ customers across the Americas. These are vendor-reported, region-wide figures and cannot prove which is most popular specifically in Chile. Toteat's published API docs clearly document external order intake, products/menu retrieval, sales/reporting, order status and webhooks. Fudo's general public API is available on Plan Pro, while its external-order integration is an approval-gated flow and Fudo's support page says approval may take up to one month. Therefore: **design adapters for both; prototype Toteat first if the target pilot restaurant can grant access; prioritize Fudo first instead if the first paying design partner uses Fudo and Fudo approves required permissions.**

### Primary references (verified 2026-10-15)

- Toteat API docs: <https://developers.toteat.com/>
- Toteat Chile product/claimed footprint: <https://toteat.com/es-cl/>
- Fudo Chile claimed footprint: <https://fu.do/es-cl/>
- Fudo public API eligibility/auth: <https://soporte.fu.do/es/articles/11939789-api-publica-de-proposito-general>
- Fudo external order integration approval: <https://soporte.fu.do/es/articles/15707531-integracion-de-pedidos-externos-via-apis>
- Transbank Webpay Plus reference: <https://github.com/TransbankDevelopers/transbank-developers-docs/blob/master/referencia/webpay/README.md>
- Mercado Pago Chile Checkout Pro Orders: <https://www.mercadopago.cl/developers/es/reference/online-payments/checkout-pro-orders/overview>
- Google Wallet loyalty object API: <https://developers.google.com/wallet/reference/rest/v1/loyaltyobject>
- Chile Law 21.719 official consolidated publication: <https://www.bcn.cl/leychile/Navegar?idNorma=1209272&idVersion=2026-12-01>
- Cloud Run region list: <https://docs.cloud.google.com/run/docs/locations>
- Cloud SQL PostgreSQL region availability: <https://docs.cloud.google.com/sql/docs/postgres/region-availability-overview>

---

Codex instruction: Read this README and `00`, `01`, `10`, `11`, `12`, `14`, `16`, and `17` before implementing any module. If two specs conflict, prefer the shared platform/domain contract and create a question or decision record instead of silently changing an interface.

# Easy Eatery

Modular restaurant SaaS, starting with **WhatsApp pickup ordering for one restaurant in Chile**. Shared catalog and ordering capabilities do not require a QR-menu subscription.

This setup includes a runnable **Spanish-default and English demo**, an optional **PostgreSQL mode with individual staff access**, a test-account WhatsApp Cloud API transport, and **24 GitHub issues across five milestones**. Both **Toteat and Fudo** are required for the initial pilot. Payment and POS adapters remain **simulated**. Default memory mode resets on restart; PostgreSQL mode preserves restaurant data. The real-provider pilot is tracked in the backlog.

The first prospect-demo scope now allows **our own kitchen dashboard and pay at pickup**, with **Webpay sandbox checkout** planned independently of a restaurant POS. Local kitchen and pay-at-pickup mode are implemented; Webpay sandbox remains pending. See [live-demo setup and account handoff](docs/live-demo-onboarding.md) and [tracking issue #27](https://github.com/arkajyotiMukherjee/easy-eatery/issues/27).

## Agent context and cloud handoff

Start with [AGENTS.md](AGENTS.md), query the committed [Graphify graph](graphify-out/graph.json), then read the relevant scoped guide before source. Give cloud orchestrators [this execution handoff](docs/cloud-agent-handoff.md). It covers subagent workstreams, implementation evidence and external blockers. Refresh with `python3 scripts/update-context.py`; CI validates freshness with `--check`. [Graphify setup](docs/graphify.md) explains the portable code and decision layers.

## Run the demo

Requires Node.js 24+ and npm.

```sh
npm ci
cp .env.example .env
npm start
```

Open [the local demo](http://127.0.0.1:3000). Enter `ADMIN_TOKEN` from your local `.env` into the panel. Replace the example token with a long random value before sharing a test environment. If `.env` is absent, the server generates and prints a temporary panel key for loopback use.

Choose **English** in the header to test the UI and chat in English. Spanish is the default; your explicit language preference is remembered in this browser. English commands: `hello`, `menu`, `cart`, `remove 1`, `clear`, `confirm`, `new`. Changing languages preserves your cart. In a real WhatsApp test conversation, send `English` or `Español` to choose the language.

1. Send `hola` in the chat simulator. Any initial text displays the menu.
2. Send `1 x 2`, then `3`: two completos and one limonada total **CLP 11,500**.
3. Send `confirmar`. Review the total and the explicitly simulated payment reference.
4. In the pickup dashboard, click **Simular pago y enviar a cocina**.
5. Mark the order ready, then confirm pickup. The dashboard updates counts and paid revenue.
6. Send `nuevo` to start another order after payment. Cart commands include `carrito`, `quitar 1`, and `vaciar` before confirmation.

The simulation payment reference points to the panel; it is not a hosted checkout and cannot charge a card. The panel button is the only simulation payment control. Refresh the operations panel to see orders received through the real WhatsApp test transport.

Set `POS_PROVIDER=toteat` (default) or `fudo` in `.env` to choose the simulated provider label. Both real adapters require provider access and implementation in #13/#22/#23. If port 3000 is occupied, set `PORT=3311` and open that port instead.

## Durable WhatsApp message processing

PostgreSQL Cloud mode queues signed inbound messages before replying to Meta and processes them asynchronously. Start the normal server after applying migration 004; its worker runs automatically. No additional provider account is needed to test the worker with fixtures. Explicit provider rejections retry with bounded backoff; uncertain sends pause for review. Authenticated `GET /api/whatsapp/delivery` shows scoped queue counts. See [delivery and recovery boundaries](docs/postgres-storage.md#durable-whatsapp-extension-10). Real-phone testing still needs the approved sender/recipient and HTTPS webhook.

## Pay at pickup without a POS

For memory-only testing set `PAY_AT_PICKUP=true`. For PostgreSQL, apply migrations and configure the specific branch through the developer CLI:

```sh
node --import tsx --env-file-if-exists=.env scripts/database.ts pickup-mode <tenant> <branch> true
```

Restart the updated server, open the panel with a token scoped to that branch, then confirm a cart. Staff uses **Accept and prepare → Mark ready → Record payment received at store → Confirm pickup**. Recording payment is an assertion by authorized staff that money was received; it does not charge a card. Orders remain unpaid through preparation/readiness. The simulated-pay endpoint rejects these orders. Confirmation/replay does not create another ticket or a fake POS reference; local mode needs no vendor catalog mappings. Existing confirmed orders keep their original payment/fulfillment method when branch settings change. Store-paid and due amounts are separate dashboard metrics; old simulation figures are demonstration data.

This is a supervised local demo. Real-phone recipient/webhook verification, durable async message delivery, ready notifications and online checkout remain separate work. Business verification is not being attempted with invented company information.

## PostgreSQL and individual staff access

For durable local data, set `PERSISTENCE=postgres`, `LOCAL_POSTGRES_PASSWORD` to a random local password, and `DATABASE_URL` to `postgresql://easy_eatery:<URL-encoded-password>@127.0.0.1:55432/easy_eatery` in `.env`. Docker Compose uses the password from that file; the application uses the connection URL. Keep both private.

```sh
docker compose up -d --wait postgres
npm run db:migrate
npm run db:seed
npm run db:staff -- santiago-demo main owner "Restaurant Owner"
npm start
```

Use the **individual token** printed by `db:staff` in the existing panel key field. Only its SHA-256 hash is stored in the database. It expires after seven days. Owner/operator tokens can perform demo order actions; viewer tokens can only read the dashboard. PostgreSQL mode **ignores `ADMIN_TOKEN`**. The restaurant/branch comes from the credential, never a request header or customer message. Seeds preserve existing catalog/account settings.

```sh
npm run db:staff -- santiago-demo main operator "Kitchen Staff"
npm run db:staff -- santiago-demo main viewer "Read-only Staff"
npm run db:revoke -- <token-id>
```

See [PostgreSQL setup and access design](docs/postgres-storage.md) for another restaurant/branch, sender mapping, migrations, revocation, testing, and operational limits. In PostgreSQL mode the POS selection is stored per branch, so `POS_PROVIDER` does not override database settings.

## Catalog and service availability

Use **Load catalog** below the order workspace. Staff can mark items sold out and pause/close pickup. Owners can edit bilingual names, CLP prices, POS codes, optional extras and local service hours. Price/mapping changes and expired quotes require the customer to review the new total and confirm again. These controls are available in both languages.

An approved developer-assisted manual import is also available through `npm run db:import-catalog -- <catalog.json>` with an individual owner token in `CATALOG_STAFF_TOKEN`. See [catalog format and availability rules](docs/catalog-and-availability.md). Example mappings are synthetic; live Toteat/Fudo ingestion and restaurant approval still need provider access. Apply pending migrations before starting an updated PostgreSQL server.

```sh
npm run check
npm test
npm run dev
```

Run the real database suite explicitly against a development/test database using `TEST_DATABASE_URL` (same URL format as above):

```sh
npm run test:db
```

It creates and removes a randomly named isolated test schema. CI runs both suites with PostgreSQL 17, including tenant/branch isolation, rollback, revocation, concurrent replay and restart recovery in a fresh Node process.

## Project map

| Area | Location | Responsibility |
| --- | --- | --- |
| Shared platform | `apps/server/src/platform` | Tenant, catalog, authoritative prices, orders and state transitions |
| WhatsApp module | `apps/server/src/modules/whatsapp` | Spanish conversation and cart; independent of QR menu |
| Integrations | `apps/server/src/integrations` | Payment/POS ports, demo adapters, signed WhatsApp webhook helpers and Cloud API transport |
| HTTP and demo UI | `apps/server/src/app.ts`, `apps/server/public` | Authenticated API, webhook ingress and accessible local simulator/dashboard |
| Tests | `tests` | Ordering, replay, isolation between conversations, auth, signatures and delivery retry |
| Delivery plan | `docs` | Scope, decisions, integrations, pilot guide and linked issue backlog |

The deployment baseline is a TypeScript modular monolith, PostgreSQL, Cloud Run and Cloud SQL in Santiago. The server uses Fastify and browser-native UI; React/Next.js can be added without changing domain services. PostgreSQL durability and scoped staff authentication are implemented; durable PostgreSQL webhook processing is implemented, while delivery-status reconciliation, staff recovery and real-provider payment/POS acceptance still require pilot validation.

## Read next

- [Original platform specifications, provenance and current adaptations](docs/sources/original-platform-specs/INDEX.md)

- [Product scope and milestones](docs/product-and-milestones.md)
- [Architecture and deployment](docs/architecture.md)
- [Provider research and test-account setup](docs/integrations.md)
- [Demo script and pilot acceptance](docs/demo-and-pilot.md)
- [GitHub issue index](docs/backlog.md), [all milestones](https://github.com/arkajyotiMukherjee/easy-eatery/milestones)

## HTTP surface

All `/api/*` routes require `Authorization: Bearer <token>`: the local `ADMIN_TOKEN` in memory mode, or an active restaurant-scoped staff token in PostgreSQL mode. The panel holds it only in page memory. PostgreSQL mode checks membership/expiry/revocation on every request and enforces roles again inside the transaction. The demo serves only known static assets.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Explicit simulation/persistence status |
| GET | `/api/dashboard` | Demo tenant's pickup metrics and order list, excluding customer IDs |
| POST | `/api/demo/messages` | `{ customerId, messageId?, text }` → `{ reply }` |
| POST | `/api/demo/orders/:id/pay` | Simulate payment and kitchen submission; never a production payment webhook |
| POST | `/api/demo/orders/:id/status` | `{ status: "ready" \| "collected" }` |
| GET | `/webhooks/whatsapp` | Meta verification challenge |
| POST | `/webhooks/whatsapp` | Signed, mapped test-account messages; available only with configured Cloud transport |

Do not point a real payment webhook at the demo payment endpoint. Durable storage does not turn the simulated financial workflow into a live payment system. Real adapters, asynchronous delivery/reconciliation and disabling demo mutations are explicit [pilot deployment requirements](https://github.com/arkajyotiMukherjee/easy-eatery/issues/19).

# Easy Eatery

Modular restaurant SaaS, starting with **WhatsApp pickup ordering for one restaurant in Chile**. Shared catalog and ordering capabilities do not require a QR-menu subscription.

This initial setup includes a runnable **Spanish-default and English demo**, a test-account WhatsApp Cloud API transport, architecture and pilot documentation, and **23 GitHub issues across five milestones**. Both **Toteat and Fudo** are required for the initial pilot. Payment and POS adapters are **simulated** in this setup. Data is held in memory and resets on restart. This is a customer discovery demo; the real-provider pilot is tracked in the backlog.

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

```sh
npm run check
npm test
npm run dev
```

## Project map

| Area | Location | Responsibility |
| --- | --- | --- |
| Shared platform | `apps/server/src/platform` | Tenant, catalog, authoritative prices, orders and state transitions |
| WhatsApp module | `apps/server/src/modules/whatsapp` | Spanish conversation and cart; independent of QR menu |
| Integrations | `apps/server/src/integrations` | Payment/POS ports, demo adapters, signed WhatsApp webhook helpers and Cloud API transport |
| HTTP and demo UI | `apps/server/src/app.ts`, `apps/server/public` | Authenticated API, webhook ingress and accessible local simulator/dashboard |
| Tests | `tests` | Ordering, replay, isolation between conversations, auth, signatures and delivery retry |
| Delivery plan | `docs` | Scope, decisions, integrations, pilot guide and linked issue backlog |

The long-term baseline is a TypeScript modular monolith, PostgreSQL, Cloud Run and Cloud SQL in Santiago. The first setup deliberately uses a small Fastify server and browser-native UI; React/Next.js can be added when the owner UI needs it without changing shared domain services. PostgreSQL durability, real staff auth and asynchronous webhook processing are required before pilot traffic.

## Read next

- [Product scope and milestones](docs/product-and-milestones.md)
- [Architecture and deployment](docs/architecture.md)
- [Provider research and test-account setup](docs/integrations.md)
- [Demo script and pilot acceptance](docs/demo-and-pilot.md)
- [GitHub issue index](docs/backlog.md), [all milestones](https://github.com/arkajyotiMukherjee/easy-eatery/milestones)

## HTTP surface

All `/api/*` routes require `Authorization: Bearer <ADMIN_TOKEN>`. The panel holds that key only in page memory; no cookies or browser storage. The demo serves only known static assets.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Explicit simulation/persistence status |
| GET | `/api/dashboard` | Demo tenant's pickup metrics and order list, excluding customer IDs |
| POST | `/api/demo/messages` | `{ customerId, messageId?, text }` → `{ reply }` |
| POST | `/api/demo/orders/:id/pay` | Simulate payment and kitchen submission; never a production payment webhook |
| POST | `/api/demo/orders/:id/status` | `{ status: "ready" \| "collected" }` |
| GET | `/webhooks/whatsapp` | Meta verification challenge |
| POST | `/webhooks/whatsapp` | Signed, mapped test-account messages; available only with configured Cloud transport |

Do not point a real payment webhook at the demo payment endpoint. Do not deploy the current in-memory app for paying customers. Production-mode provider adapters and disabling demo mutations are explicit [pilot deployment requirements](https://github.com/arkajyotiMukherjee/easy-eatery/issues/19).

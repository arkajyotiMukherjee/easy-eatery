# HTTP boundary and runtime composition

Start at `createApp` in `app.ts`; it constructs ordering and conversation services, wraps scoped PostgreSQL units of work, authenticates API requests, validates payloads, maps localized errors, serves allowed static files and verifies webhook ingress. `index.ts` selects memory/PostgreSQL mode and console/Cloud WhatsApp transport, checks startup configuration and closes resources.

Query `createApp` or `Config` in Graphify before following dependencies. Shared decisions live in `platform/`; external I/O in `integrations/`; durable state and roles in `persistence/`; WhatsApp commands in `modules/whatsapp/`. Each has a scoped guide.

Preserve bearer authentication for `/api/`, schema rejection of extra input, raw JSON bytes for webhook HMAC, mapped receiving account scope, CSP and no-store responses. Demo routes are under `/api/demo`; pickup actions under `/api/pickup`. Do not trust body-supplied tenant/branch or browser totals. Network sends happen outside database transactions; PostgreSQL Cloud webhooks commit jobs before acknowledgment; memory mode is synchronous and test-only. Unknown outbound outcomes are parked for review. A process queue is not distributed exactly-once delivery.

For routes/auth/signatures run `npm run check`, `tests/poc.test.ts` through `npm test`, and database integration checks when storage scope changes. For local pickup also inspect `tests/pickup.test.ts`.

Durable exception recovery routes live under `/api/whatsapp/delivery/jobs`; `persistence/whatsapp-recovery.ts` owns scoped listing and guarded transitions. Route schemas require explicit expected state and review-without-resend confirmation. See `docs/whatsapp-recovery.md`; do not turn uncertain sends into automatic retry or claim delivery from staff review.

The opt-in `loyaltyDemo` service registers isolated `/api/demo/loyalty` endpoints and assets. It is only enabled by the dedicated loopback launcher, rejects PostgreSQL/live transport combinations, and shares memory-mode bearer authentication. See `modules/loyalty/AGENTS.md`; this does not add loyalty to live restaurant storage.

# PostgreSQL storage and restaurant access (#6)

## Durable WhatsApp extension (#10)

Migration 004 adds a scoped durable message queue. PostgreSQL Cloud mode commits a verified inbound job before acknowledging the webhook. Domain changes, the cached reply and reply-pending state commit together; network sends run after a committed claim. The server polls automatically, with branch locks and persisted claims coordinating multiple processes. Explicit provider rejections have bounded retries/backoff; a timeout, malformed acceptance response, or expired send claim becomes `needs_attention` and is not automatically resent. Later messages from that conversation wait; unrelated conversations can continue. A provider acceptance reference is stored when returned. This is not proof of device delivery or exactly-once network sending.

Use authenticated `GET /api/whatsapp/delivery` for branch-scoped counts by queue state without customer identifiers. Failed/uncertain jobs need operator investigation; there is no blind retry control. Keep the affected conversation paused until the provider-side outcome is understood. Delivery-status callbacks, retention/deletion policy and the staff recovery UI remain follow-up acceptance work in #10/#12/#20. Memory mode retains synchronous test-only delivery.

The timer stops before the application pool closes. After a crash, pending work/replies remain in PostgreSQL; expired send claims are parked for review because the external outcome cannot be inferred from a local receipt. Apply migrations before starting the updated runtime. Do not enable Cloud mode until real sender mapping, recipient permission, HTTPS callback and private runtime credentials are verified.

## Modes and boundaries

`PERSISTENCE=memory` retains the quick local prototype. `PERSISTENCE=postgres` requires `DATABASE_URL`, an applied migration, a seeded branch and an individual staff token. It never falls back to memory or the shared admin key when the database is unavailable. `/health` checks connectivity and reports the storage mode. Both modes still use simulated checkout/POS adapters.

The existing bilingual panel accepts the scoped credential in its panel-key field. It shows the connected restaurant/branch and actual storage mode; viewer accounts have no order-action controls. Changing credentials clears the displayed chat/dashboard, and late responses from an earlier credential cannot replace the current account's data. The simulator uses a new synthetic customer on each login; WhatsApp identities and their persisted conversations are independent of this browser behavior.

## Local setup

Set the ignored `.env` values shown in the README, then run Docker Compose, migrations, seed and staff issuance. The Compose database binds to loopback port 55432 and uses a named volume. `docker compose down` stops it without removing the volume. Do not use `down -v` unless deliberately discarding the local database. Only run seed against a development/test environment: it inserts a sample menu.

Seed defaults: tenant `santiago-demo`, branch `main`, restaurant `Mesa Sur`, provider `toteat`. To create another configuration, set `SEED_TENANT_ID`, `SEED_BRANCH_ID`, `SEED_RESTAURANT_NAME` and `SEED_POS_PROVIDER` (`toteat` or `fudo`) before `npm run db:seed`. Set `SEED_WHATSAPP_PHONE_ID` when mapping an authorized test sender. A phone ID can map to exactly one branch; attempting to seed it into a different branch fails and rolls back.

Repeatable seed inserts missing rows only: it does not reset prices, change provider configuration, overwrite another phone mapping or issue replacement credentials. `db:staff` is explicit so re-seeding does not unexpectedly mint access tokens.

## Authentication and roles

`npm run db:staff -- <tenant> <branch> <role> <display-name>` creates a named staff user, branch membership and a cryptographically random 256-bit opaque bearer credential. The token is printed once; only its SHA-256 digest, ID, expiry and scope are persisted. The CLI uses database-operator privileges and is not exposed as a public signup endpoint. Default validity is seven days. Keep CLI output out of Git, tickets and logs; the panel does not save the token in browser storage.

| Role | Dashboard | Simulated customer/order actions | Account administration |
| --- | --- | --- | --- |
| owner | Own branch | Own branch | Bootstrap via trusted DB CLI only in this POC |
| operator | Own branch | Own branch | None |
| viewer | Own branch | Denied | None |

`npm run db:revoke -- <token-id>` immediately invalidates the credential on subsequent requests. Disabling a membership invalidates all its tokens. Token expiry and membership role are rechecked inside a transaction, so a cached identity cannot bypass a role downgrade/revocation before work starts. For rotation, issue a replacement staff credential and revoke the old ID through the trusted CLI. Full self-service staff lifecycle, OIDC and owner-management UI remain future work.

## Data integrity and unit of work

Migration `001_restaurant_storage.sql` creates tenants/branches, users/memberships/tokens, sender mappings, products, conversations, orders/immutable line snapshots, simulation payment attempts, inbox replies, outbox state events, delivery receipts and audit events. Tenant-and-branch composite keys/FKs prevent cross-scope order/session/product references. Tokens have a unique digest and provider references are unique within their account scope.

The repository authenticates staff into a server-derived scope. Webhooks authenticate exact raw bytes first and then resolve the configured receiving phone ID through `channel_accounts`. Customer text, body properties, query parameters and `X-Tenant-ID` cannot select a restaurant. Unknown JSON properties are rejected rather than silently stripped.

Each unit of work uses one checked-out PostgreSQL client for `BEGIN` through `COMMIT`/`ROLLBACK`, following [node-postgres transaction guidance](https://node-postgres.com/features/transactions). It locks the branch row before loading that branch's working set, as described by [PostgreSQL row-lock semantics](https://www.postgresql.org/docs/17/explicit-locking.html). This serializes concurrent app instances for the small POC without relying on an in-process mutex. Queries are parameterized, all domain reads/writes include tenant/branch scope, and save rejects changes to the transaction's scope or confirmed line/amount/provider snapshot.

The domain's Maps are transaction-local working sets in PostgreSQL mode. The database is the durable source; nothing from a previous request is required to reconstruct the next. Persisted inbox replies prevent repeated messages from adding items again after restart. Payment/POS references survive restart. State changes enqueue uniquely keyed outbox records in the same transaction, and mutations append an audit record with actor/action and scope. Audits do not contain message bodies, tokens or phone numbers.

This deliberately loads/saves one branch's small dataset per operation and uses a branch-level lock. It prioritizes correctness for the initial pilot; it is not suitable for unlimited order history/high throughput. Before increasing scale, replace bulk hydration with bounded per-aggregate queries and narrower locking while retaining the same isolation tests. Database RLS is not enabled; isolation currently relies on the authenticated repository boundary plus composite constraints. Use separate migration/admin and least-privilege application database users before staging customer data.

## Migration and failure behavior

`npm run db:migrate` takes a transaction-scoped migration lock, records each migration's checksum and applies pending SQL atomically. Re-running it is safe; modifying an already applied migration fails. Add a new numbered migration for changes. Startup checks for the schema and never silently runs DDL or seed. Migration rollback and application transaction rollback release the checked-out client.

The original #6 baseline persisted inbox replies and successful outbound-delivery receipts. The #10 extension described above now adds durable async delivery in PostgreSQL Cloud mode. Network calls occur outside the state transaction. A crash between an outbound send and its receipt commit can still resend a reply; the new queue prevents blind automatic replay of ambiguous sends; provider delivery status and manual reconciliation remain acceptance work in **#10**. The outbox has no live payment/POS worker in this change. **#8** still owns the full separated financial/fulfillment state model and richer event contracts. Persisted catalog-version/expiry quote checks are implemented in the #7 extension. **#13/#22** still own real provider side effects. The local fake adapters must not be mistaken for exactly-once financial processing.

## Verification

`npm test` covers the original seven demo cases plus catalog validation, pricing, modifier and availability cases. `npm run test:db` requires an explicit `TEST_DATABASE_URL`, creates a randomly named schema, and removes only that schema afterward. It checks repeatable migrations/seed, hashed/scoped credentials, concurrent deduplication across app instances, tenant/branch read/write isolation, FK isolation, revoked/expired/disabled credentials, role downgrade, rollback after order/outbox SQL writes, immutable snapshots, recovery in a fresh Node process, and signed webhook account routing/replay after restart. CI uses an isolated PostgreSQL 17 service.

Keep `DATABASE_URL` private and configure TLS/CA verification for remote deployments; local Compose is loopback-only development infrastructure. No real provider credentials, customer data, merchant account or cloud database is provisioned by this change.

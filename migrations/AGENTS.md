# Database schema history

Ordered SQL migrations are loaded by `migrate` in `apps/server/src/persistence/database.ts`, using an advisory transaction lock and SHA-256 checksums. `001_restaurant_storage.sql` introduces scoped storage/access, `002_catalog_availability.sql` extends catalog/quotes, and `003_pickup_payment.sql` adds pickup payment state. `004_whatsapp_jobs.sql` adds durable message processing; `005_whatsapp_recovery.sql` adds the explicit staff-reviewed `resolved` terminal state without calling it sent or delivered.

Add the next numbered migration for schema changes; never rewrite applied history. Preserve tenant/branch composite keys, foreign-key isolation, nonnegative integer monetary constraints and immutable snapshots. Update repository load/save and domain types alongside schema changes. Migration execution is explicit (`npm run db:migrate`), never implicit server-startup DDL.

Use `docs/postgres-storage.md` and `tests/postgres.integration.ts`. Verify repeatable migrations, rollback and cross-scope rejection with `npm run test:db` on a disposable database. Do not migrate a live database for context discovery.

Migration 006 adds explicit sandbox branch selection, immutable attempts and test financial states; 007 stores signed delivery evidence independently; 008 adds verified provider timestamps, order contacts, staff handoffs and notification claims. Apply all pending migrations explicitly; old timestamp-less replies are parked for staff review.

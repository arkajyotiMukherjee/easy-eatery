# PostgreSQL repository and access

`database.ts` owns Pool creation, checksum-tracked migrations, staff-token hashing/issuance, channel identity, role authorization and `PostgresRepository.transaction`. Query `PostgresRepository`, `authenticate`, `channelIdentity`, `migrate` and `seedBranch`.

Transactions lock the branch row, recheck access, load a transaction-local MemoryStore, invoke services, persist mutations and audit, then commit or roll back and release the client. Maps here are working sets; PostgreSQL is durable truth. Scope every read/write and constraint by tenant and branch. Viewer is read-only; catalog replacement requires owner. Recheck token revocation, expiry, active membership and role inside the unit of work.

Preserve immutable confirmed lines, price/provider/payment-method snapshots, integer totals, scoped inbox/delivery deduplication and outbox keys. External sends stay outside transactions; persisted receipts cannot resolve a crash after send but before commit. Schema changes require a new migration in `migrations/` plus load/save alignment. Never edit an applied migration: checksums reject drift.

Read `docs/postgres-storage.md`; run `npm run check`, `npm test` and `npm run test:db` against a disposable explicit TEST_DATABASE_URL for repository/schema changes.

`whatsapp-queue.ts` owns persisted inbound jobs, atomic domain/reply processing, claimed external sends, bounded retries and uncertain-outcome parking. Branch locks coordinate workers; provider acceptance is not device delivery. Query `WhatsAppQueue` before changing delivery behavior. Update the handoff and canonical context after changes.

`whatsapp-recovery.ts` exposes a redacted exception list and staff-only recovery through the same branch transaction and current-token authorization. Retry is limited to `failed` jobs; ambiguous `needs_attention` jobs can only be explicitly resolved without resending. The terminal `resolved` state unblocks later conversation messages but does not create a delivery receipt or imply success. Recovery requires the listed version and increments it atomically, so an old retry cannot reopen a later failure after the worker returns to the same state. Recovery audit actions include the job ID; do not add freeform customer text.

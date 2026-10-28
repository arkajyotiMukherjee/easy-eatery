# Verification map

Use Node's built-in test runner with tsx. `npm test` selects `*.test.ts`; PostgreSQL integration is separate (`npm run test:db`). `npm run check` validates TypeScript and browser module syntax.

- `poc.test.ts`: Fastify/demo API, authentication, WhatsApp flow/transport/signatures, language and replay behavior.
- `catalog.test.ts`: strict import validation, mappings/modifiers, availability/hours and quote invalidation.
- `pickup.test.ts`: local pay-at-pickup acceptance, store payment, status gates and payment-mode separation.
- `whatsapp-status.test.ts` / `whatsapp-status.integration.ts`: bounded status normalization and signed, scoped, replay-safe provider evidence; synthetic fixtures never establish real-device acceptance.
- `whatsapp-recovery.integration.ts`: scoped exception listing, guarded retries, explicit uncertain-send review, audit, current authorization, races and conversation release. Requires disposable `TEST_DATABASE_URL`.
- `postgres.integration.ts`: migrations, tokens/roles, tenant/branch isolation, transaction rollback, durable replay, concurrency and process restart.

Graph seeds: test file paths, `createApp`, `OrderingService`, `PostgresRepository`. AST extraction may not represent every test callback; read the relevant file to verify coverage. Keep tests behavior-focused, deterministic and fake external transports/providers. Close app/pool resources. Database tests require explicit TEST_DATABASE_URL, create a random schema and drop only that schema. Never substitute an application's production DATABASE_URL. CI provisions PostgreSQL 17 in `.github/workflows/ci.yml`.

`webpay.integration.ts` covers durable sandbox authority, concurrency, restart, mismatches and full test reversals; `whatsapp-support.integration.ts` covers state-derived bilingual notifications, closed windows, replay and human handoff. `pos-boundary.test.ts` is synthetic port coverage, not vendor acceptance.

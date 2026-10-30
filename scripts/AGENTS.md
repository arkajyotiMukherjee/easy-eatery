# Operator scripts

`database.ts` dispatches migrate, seed, staff and revoke actions through the repository helpers. `import-catalog.ts` reads a bounded JSON file, authenticates CATALOG_STAFF_TOKEN, then runs owner-only `catalog.replace` in a scoped transaction. Graph seeds: `seedBranch`, `issueStaffToken`, `validateCatalogImport`.

Run through root package scripts so tsx and env-file handling match the server. Validate arguments before side effects, retain authenticated scope, close pools in finally blocks and never print stored credentials. Staff issuance deliberately emits a new credential for its operator; do not copy that output into docs or commits. Use `examples/catalog.sample.json` for the reviewed/versioned import shape.

Read `docs/postgres-storage.md` and `docs/catalog-and-availability.md`. Validate with `npm run check`; database script changes need disposable-database integration coverage. Do not run seed, issue/revoke tokens or import catalogs merely to inspect behavior.

`update-context.py` is an offline context maintenance tool. Refresh with the pinned Graphify environment; `--check` needs only Python standard library and validates graph integrity plus source/artifact hashes. It must not run migrations, issue tokens or call providers.

`rehearse-demo.ts` starts and stops isolated loopback memory-mode servers through the real entrypoint. Run `node --import tsx scripts/rehearse-demo.ts` for Spanish/English local pickup and both simulated POS labels, HTTP/auth/replay/state/metrics checks. It accepts no target URL, overrides persistence/transport for its own child processes, uses ephemeral credentials without printing them, and never contacts providers or an existing database. See `docs/operations-rehearsal.md` for separate browser, PostgreSQL, packaging, privacy and staging gates.

`database.ts sandbox-mode` explicitly selects a development branch for Webpay integration/local fulfillment, disables pay at pickup for new orders and leaves confirmed snapshots unchanged. See `docs/webpay-sandbox.md`.

`loyalty-demo.ts` runs a separate loopback synthetic loyalty console with its own locked atomic JSON snapshot. It deliberately ignores `.env` and restaurant/provider configuration. See `docs/loyalty-demo.md`; only fictional data belongs in its ignored `.demo/` directory.

`rehearse-loyalty-browser.py` is an optional Playwright/Chromium real-process rehearsal. It uses a temporary snapshot/port and test-only key, stops its processes, and writes only synthetic ignored screenshots under `.demo/evidence/`. It also simulates a lost committed HTTP response to verify replay safety.

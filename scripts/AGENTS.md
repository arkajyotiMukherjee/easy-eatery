# Operator scripts

`database.ts` dispatches migrate, seed, staff and revoke actions through the repository helpers. `import-catalog.ts` reads a bounded JSON file, authenticates CATALOG_STAFF_TOKEN, then runs owner-only `catalog.replace` in a scoped transaction. Graph seeds: `seedBranch`, `issueStaffToken`, `validateCatalogImport`.

Run through root package scripts so tsx and env-file handling match the server. Validate arguments before side effects, retain authenticated scope, close pools in finally blocks and never print stored credentials. Staff issuance deliberately emits a new credential for its operator; do not copy that output into docs or commits. Use `examples/catalog.sample.json` for the reviewed/versioned import shape.

Read `docs/postgres-storage.md` and `docs/catalog-and-availability.md`. Validate with `npm run check`; database script changes need disposable-database integration coverage. Do not run seed, issue/revoke tokens or import catalogs merely to inspect behavior.

`update-context.py` is an offline context maintenance tool. Refresh with the pinned Graphify environment; `--check` needs only Python standard library and validates graph integrity plus source/artifact hashes. It must not run migrations, issue tokens or call providers.

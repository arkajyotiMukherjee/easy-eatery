# Catalog fixtures

`catalog.sample.json` shows the manual, reviewed import shape accepted by `validateCatalogImport` in `apps/server/src/platform/catalog.ts`: expectedVersion, manualApproved, bilingual product/modifier names, integer CLP prices, availability and provider mappings. It is sample data, not verified provider ingestion or merchant configuration.

Keep samples aligned with runtime validation and `docs/catalog-and-availability.md`. Inspect `tests/catalog.test.ts` for valid/invalid import behavior. Importing the sample is an explicit database mutation through `npm run db:import-catalog -- <file>` with DATABASE_URL and owner CATALOG_STAFF_TOKEN; do not execute it for documentation checks.

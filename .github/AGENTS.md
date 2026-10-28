# CI and contribution automation

`workflows/ci.yml` runs npm ci, npm run check, npm test and npm run test:db on Node 24 with an isolated PostgreSQL 17 service. Keep its disposable database credentials confined to CI and preserve minimal contents:read permissions. Database tests require TEST_DATABASE_URL and create their own schema.

`ISSUE_TEMPLATE/task.yml` defines structured task intake. Align changes with the product/backlog docs without claiming those snapshots are live issue state. Workflow edits should preserve reproducible lockfile installation and separate memory/database verification; no real provider credentials or outbound messaging are required for CI.

CI also runs `python3 scripts/update-context.py --check`; changes to indexed sources/docs/guides must regenerate and commit the canonical graph/report/hash metadata. Keep this gate enabled.

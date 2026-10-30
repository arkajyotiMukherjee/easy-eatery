# Deployment, Environments & Operations

## 1. Initial provider/region recommendation

Use Google Cloud as the initial managed deployment baseline because the official location documentation lists both Cloud Run and Cloud SQL PostgreSQL in `southamerica-west1` (Santiago). Keep frontend/API/worker/database in the same region to reduce latency and cross-region charges. Use Cloudflare for DNS/CDN/WAF if its plan and configuration are appropriate; cache only public static assets/menu responses.

References: [Cloud Run locations](https://docs.cloud.google.com/run/docs/locations), [Cloud SQL PostgreSQL region availability](https://docs.cloud.google.com/sql/docs/postgres/region-availability-overview). AWS announced a Chile region planned for end of 2026; verify launch and service availability before considering it a current production option: <https://aws.amazon.com/es/local/chile/>.

This is a deployment baseline, not a contractual data residency guarantee. Verify region for every ancillary service, backups, logs and subprocessors.

## 2. Environments

- `local`: Docker Compose PostgreSQL, seeded synthetic test data, local object storage emulator optional.
- `dev`: shared development cloud environment, no real customer data/production credentials.
- `staging`: provider sandbox credentials, migration rehearsal, limited access, realistic synthetic fixtures.
- `production`: separate project/service accounts/secrets, backups and alerting enabled.

Never copy production customer data into dev/staging without formal anonymization and approval.

## 3. Runtime services

Start with three Cloud Run services (web, API, worker) and managed Cloud SQL for PostgreSQL. If the first MVP is particularly small, web/API can share deployment temporarily, but keep code packages separated so splitting is easy. Cloud Run may scale to zero; verify SSE connection behavior, min instances and timeouts before relying on it for a kitchen screen. SSE reconnect/polling is mandatory.

Worker must have constrained concurrency/max instances. Set DB connection limits and use Cloud SQL connector/pooling where supported; prevent autoscaling from exhausting PostgreSQL connections. `pg-boss` uses DB persistence, so monitor queue depth and queue-table growth.

## 4. Infrastructure-as-code and deploy

- Use Terraform or Google Cloud deployment configuration checked into repository. Do not manually click-provision production resources without capturing configuration.
- CI: lint/typecheck -> unit -> integration tests -> migration validation -> build -> container scan -> deploy staging -> smoke/E2E -> manual approval -> production rollout.
- Migrations run once as a controlled release job before/with backward-compatible code deployment. Use expand/contract: add nullable fields/tables, deploy compatible code, backfill, then constrain/remove later.
- Every deploy has commit SHA, build metadata and rollback/forward-fix plan.
- Don't automatically run destructive migrations on every horizontally scaled app instance.

## 5. Data protection / backup

- Managed PostgreSQL automated backups and point-in-time recovery if available in chosen tier.
- Define target RPO/RTO in plain terms; for first paying restaurant, a documented recovery process matters more than an enterprise promise.
- Monthly restore test initially, then increase cadence when revenue/dependency warrants.
- Store PDFs/menu assets separately with lifecycle policies; database backup alone does not preserve object content.
- Retain secrets/rotation references separately from database backups.

## 6. Observability

Metrics:
- API latency/error by route/module/tenant (avoid PII labels).
- order creation, payment pending duration, payment mismatch, order status lag.
- queue depth, retries, dead-letter jobs, worker age.
- POS sync lag/failures/429s per connection.
- WhatsApp send failure/opt-out rate.
- Wallet pass sync lag/errors.
- database CPU/storage/connections, slow queries and backup status.

Structured logs include `request_id`, `tenant_id` (non-PII), `branch_id`, module, provider, connection ID and correlation ID. Redact secrets and raw payload fields. Add health endpoints for liveness/readiness; readiness checks dependencies conservatively to avoid restart storms.

## 7. Cost controls

- Set Cloud Run min instances to zero initially unless kitchen reconnect/latency demonstrates a need.
- Configure maximum instances to protect database and provider quotas.
- Cache public menu content, optimize images and avoid unnecessary egress.
- Keep job retries bounded with backoff; alert instead of retrying forever.
- Cap LLM usage per tenant/module and require explicit model invocation.
- Meter paid WhatsApp/provider activity.
- Review per-tenant support hours as cost of service, not just cloud bill.

## 8. Operations runbooks required before first production restaurant

1. Payment pending/reconciliation mismatch.
2. POS credentials expired/rotated/provider down.
3. Duplicate/missing order after timeout.
4. Queue backlog/dead-letter replay.
5. Customer data export/delete request.
6. WhatsApp opt-out/credential outage.
7. Backup restore and incident response.
8. Roll back web/API and safely handle database migrations.

## 9. Release gates

No production release until: backups active, restore procedure tested, secret rotation documented, provider sandbox tests pass, alerting routes to a human, tenant-isolation tests pass, privacy and terms reviewed, and owner has a manual fallback for critical operations.

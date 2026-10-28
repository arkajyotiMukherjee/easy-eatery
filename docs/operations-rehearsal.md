# Local rehearsal and supervised staging handoff

This runbook supports the synthetic prospect demo and issues #18–#21/#27. It supplies repeatable local evidence and an operator checklist. It does not authorize a production launch, cloud spending, real customer messages or provider acceptance.

## Automated local acceptance

From the repository root with Node 24+ and `npm ci` completed:

```sh
npm run check
npm test
node --import tsx scripts/rehearse-demo.ts
python3 scripts/update-context.py --check
```

The rehearsal starts three fresh, loopback-only server processes using the real entrypoint: local pay at pickup, simulated Toteat and simulated Fudo. Each process uses its own random in-memory panel credential and available local port. No credential or customer identifier is printed. Existing `.env` files and existing servers are preserved; explicit child environment settings select memory persistence and console transport even when a developer has configured PostgreSQL or Cloud transport elsewhere. The script accepts no target URL or arguments, so it cannot mutate an existing deployment.

Each mode exercises Spanish and English ordering through actual HTTP requests, duplicate message/confirmation handling, the CLP 11,500 total, required payment/fulfillment gates, duplicate staff actions, collection metrics, missing-auth rejection, and delivery of the known browser assets. The script closes the processes it starts, including after a failed assertion, and returns a nonzero exit status on failure. Its data disappears when each process stops. No database migration, staff issuance or provider API call occurs.

Passing this script establishes HTTP demo behavior only. Run `npm run test:db` separately with an explicit disposable `TEST_DATABASE_URL` for PostgreSQL isolation, rollback, replay and process-restart recovery. Never use a production database URL. Automated checks do not prove keyboard accessibility, mobile layout, a real WhatsApp recipient loop, payment-provider authorization, POS kitchen acceptance or cloud backup recovery.

## Browser and restaurant feedback rehearsal

Use the README to start a separate supervised demo with synthetic data. For each language, use a narrow mobile viewport and then a desktop viewport; record the browser and viewport with the result. Complete these actions using only the keyboard as well as the pointer:

1. Open the panel, select the language, enter the panel key, and verify visible focus and readable error messages after an invalid key.
2. Add items, change language while a cart exists, edit the cart, and confirm the authoritative total. Check that accessible names and labels change with the selected language.
3. Complete the appropriate simulation or local pay-at-pickup flow. In local mode, confirm that preparation and readiness remain unpaid until staff records payment at the store. Attempt collection before payment and verify the refusal.
4. Mark an item unavailable or close pickup. Confirm that a new order is blocked and that existing confirmed orders keep their original method and price.
5. Verify empty, loading, unavailable and error states without exposing credentials or real contacts in a screenshot. Reload and confirm the panel key is not retained. In memory mode expect order data to disappear after server restart.

Capture results using this template in an approved private evidence location; keep only a redacted summary in issues:

| Field | Record |
| --- | --- |
| Build and workflow | Commit SHA; local memory / disposable PostgreSQL / authorized sandbox |
| Reviewer and session | Assigned operator role, date, browser, viewport, ES/EN |
| Menu and service | Synthetic catalog version; service hours and expected pickup promise |
| Cases | Pass/fail/unrun for each step above; observed behavior and reproduction |
| Restaurant feedback | Menu/modifier clarity, missed or duplicate tickets, staff effort and objections |
| Timing | Confirm-to-accept and ready-to-collection; synthetic measurements only |
| Follow-up | Issue, owner, next action and acceptance evidence still needed |

Do not invent restaurant validation or record an unchecked case as passed. Ask the restaurant partner to sign off actual menu, kitchen ownership, service hours and support responsibility before a real pilot.

## Packaging and authorized staging

The checked-in Dockerfile runs Node 24 as the `node` user, starts the same TypeScript server, and defaults to port 8080. Building an image is a local packaging check:

```sh
docker build -t easy-eatery:rehearsal .
```

The image needs development dependencies because `tsx` is the runtime loader. Do not prune them without changing and validating the packaging design. `.dockerignore` excludes `.env`, local dependencies, Git metadata and the context graph; never add a credential file to the build context or image. Before accepting the packaged build, run it with a fresh random `ADMIN_TOKEN` injected through the runtime environment, bind its published port to loopback, and verify `/health`, unauthenticated API rejection and a synthetic ordering journey. Stop the test container afterward. A successful build alone does not establish runtime readiness.

Staging remains gated on an approved account, budget and hosting plan. The documented target is Cloud Run and Cloud SQL in Santiago; check service availability and cost before provisioning. Hostinger is not an approved alternative merely because a connector is available. No paid resource creation or provider setup is part of this runbook.

Before an authorized staging launch, assign an operator and record the image digest, revision, nonsecret configuration, schema version and rollback revision. Use a separate database, least-privilege identity and secure runtime secret bindings. In PostgreSQL mode, apply reviewed migrations explicitly before starting the server; startup does not migrate or seed. Keep staff credentials scoped and expiring. Do not expose the in-memory demo as a customer service. Live pilot deployment also needs simulation mutation controls, retention/deletion policy, tested database backup restoration, provider reconciliation and operational ownership; these are separate acceptance gates.

## Incidents, rollback and privacy

Stop a supervised demo or pause new orders when payment state, kitchen acceptance or delivery outcome is uncertain. The operator owns customer follow-up; engineering owns diagnosis. Inspect scoped dashboard counts and redacted correlation/order references. Do not dump queue payloads, messages, phone numbers, access tokens, checkout URLs or raw provider responses into logs, screenshots, Git or issues.

For ambiguous outbound sends, preserve the recorded attempt and reconcile the provider outcome before retrying. A provider HTTP acceptance is not device delivery. Do not delete a parked job, edit order/payment rows or replay an unknown POS submission to clear a dashboard warning. An operator must not infer payment from a browser redirect or mark a real payment settled using a demo endpoint. Escalate unsupported reconciliation/refund operations instead of fabricating success.

For an application rollback, first pause incoming work through the hosting system's approved controls, retain the database and audit history, and route traffic to the last compatible image/revision. Check migration compatibility before switching. Numbered migrations are not an automatic down-migration plan; do not drop tables or reset data to make an older revision start. If compatibility is unknown, keep the service paused and use a reviewed forward repair or an isolated restore rehearsal. After recovery, recheck health, staff scope, queue state and synthetic ordering, then have the assigned operator authorize resumption.

The application stores conversation and order state; existing memory maps and durable inbox/outbox data do not establish a production retention policy. Agree access, retention periods, deletion/export handling and incident contacts with the restaurant before collecting customer data. Keep demo evidence synthetic. Backups and restores must be tested using isolated data before claiming recovery readiness, and any real data restore must preserve access controls and reconciliation obligations.

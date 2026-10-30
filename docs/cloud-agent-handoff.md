# Easy Eatery: cloud orchestrator handoff

Snapshot: 28 October 2026. This is an execution brief, not a transcript or proof that external integrations work. Verify GitHub and current source before relying on a status. Do not copy account credentials or local demo tokens into this document.

## Mission and delegation authorization

Continue building the smallest credible Chile restaurant pickup demo and complete every pilot-readiness task that can be completed without restaurant POS access, legal business verification, production merchant authorization or unapproved cloud spending. The founder explicitly requests a cloud orchestrator that can spawn subagents: use bounded parallel specialists with explicit shared-file ownership, and integrate/test their results. Cloud setup uses the existing isolated checkout; do not create a worktree unless explicitly requested by the user. Delegation is authorized for this work; it does not authorize vendors, purchases, legal agreements or production messages on the founder's behalf.

Deliver runnable implementation and reviewed PRs, not only plans. Do not stop all work because one external gate is blocked. Finish independent work, document the precise remaining owner action, and report separate demo and restaurant-pilot readiness. Never mark the whole pilot complete based on fixtures or simulated provider references.

## Start here: Git → graph → scoped guide → targeted source

1. Read root `AGENTS.md`; inspect `git status`, recent commits, branch/base and live PR/issue state. Preserve unrelated changes. Start from current `origin/main`, not the old development branch named in a chat.
2. Run a focused graph query with the committed `graphify-out/graph.json`. Read `docs/graphify.md` for installation and `scripts/update-context.py --check` for freshness. Query results are navigation evidence, not runtime or vendor acceptance proof.
3. Read the nearest scoped `AGENTS.md` and its ancestors. Then read only the relevant source, migrations and tests. The graph also has curated decision/blocker nodes from `docs/context-decisions.json` pointing to this brief and relevant code.
4. Read this brief, `docs/live-demo-onboarding.md`, `docs/product-and-milestones.md`, `docs/backlog.md` / `backlog.json`, and `docs/github-issues.json` as needed. Live GitHub state outranks a stale issue snapshot; newer explicit founder direction outranks an older roadmap assumption.
5. Refresh the context layer after each implementation slice. Commit code, updated decisions/handoff/scoped guides, canonical graph and source hashes together. See the root context-maintenance rules; generated caches, credentials and virtual environments stay untracked.

## Product decisions that must survive the handoff

- Product: Easy Eatery, operated by Arkaive Studio, initially for Chile. The founder cannot read Spanish and tests in English. Spanish is the default; English must cover customer messages, staff controls, errors, empty states and menus. Language switches preserve cart/order data. Prices are integer CLP; restaurant dates/hours use `America/Santiago`.
- Modular shared infrastructure owns tenants, staff, catalog, pricing, quotes, orders, financial state and fulfillment. WhatsApp ordering is the first independent module. Disabling or omitting a QR menu must never break ordering. QR/storefront/loyalty/CRM/inventory are future modules, not prerequisites for this demo.
- A two-person team wants a prospect demo before securing a restaurant. No actual Chilean restaurant POS account is currently available. Use a synthetic menu and the application's own kitchen dashboard.
- First working fallback: WhatsApp-style ordering → confirm total → local staff acceptance/preparation → ready → staff records payment received at store → collection. Recording store payment is an audited staff assertion, not a gateway charge or proof of bank settlement.
- Desired stronger demo: real hosted **Webpay sandbox** checkout and authoritative payment reconciliation, followed by local kitchen fulfillment. It may be independent of POS. Pay at pickup remains a separate explicit method; do not silently convert an uncertain online payment into cash collection.
- **Both Toteat and Fudo** remain intended restaurant-pilot connectors. Each branch/order selects one destination; never send an order to both. The first prospect demo is not gated on either connector. A specific restaurant rehearsal uses its selected connector; claiming both-provider acceptance requires separate evidence for both.
- Preserve immutable confirmed prices/items/payment/fulfillment/provider routing, quote expiry and reconfirmation, server-side scope and availability validation, idempotent domain effects and truthful reporting. Payment success, kitchen acceptance, pickup readiness and collection are distinct facts.

## Verified implementation baseline

Repository: `https://github.com/arkajyotiMukherjee/easy-eatery`.

Merged changes, verified at handoff:

| PR | Delivered behavior |
| --- | --- |
| #24 | Modular TypeScript foundation, bilingual browser/chat simulation, Cloud API text transport and signed ingress scaffold |
| #25 | PostgreSQL durability, migrations, individual hashed/expiring/scoped staff tokens, role enforcement, audit/outbox |
| #26 | Versioned bilingual catalog/manual import, product/modifier mappings, availability/hours, immutable/expiring quotes and staff catalog controls |
| #28 | Local kitchen/pay-at-pickup, financial state separate from preparation, authenticated audited staff actions, truthful dashboard totals |
| #29 | PostgreSQL durable WhatsApp jobs, asynchronous ACK/worker, per-conversation sequencing, bounded retries and ambiguous-send parking |

Baseline implementation merge: `85cc1c3d1d45c559bc38c4e0e6b678b63c383f00` (merge of #29). Use a newer main if available. The old local branch `codex/durable-whatsapp` contains its implementation commit `e1784c6`; it is not a requirement for cloud work.

Stack: Node 24+, TypeScript ESM, Fastify 5, browser-native HTML/CSS/JS, pg/PostgreSQL 17, Docker/Compose, GitHub Actions. No React/Next.js build or microservice platform is required. Current payment and POS adapters are simulations; real WhatsApp outbound transport exists. There is no production deployment.

Relevant code map (query these names first):

| Area | Files / graph seeds |
| --- | --- |
| Runtime, auth, ingress and routes | `apps/server/src/app.ts` (`createApp`), `index.ts` |
| Tenant/cart/order/quote | `platform/domain.ts` (`MemoryStore`), `catalog.ts` (`CatalogService`), `ordering.ts` (`OrderingService`) |
| Conversation | `modules/whatsapp/conversation.ts` (`Conversation`) |
| External transport/contracts | `integrations/whatsapp.ts` (`CloudWhatsAppTransport`, `WhatsAppDeliveryError`, `parseMessages`), `contracts.ts` |
| Durable units of work | `persistence/database.ts` (`PostgresRepository`) |
| Message worker | `persistence/whatsapp-queue.ts` (`WhatsAppQueue`) |
| Browser | `apps/server/public/app.js`, `catalog-ui.js`, `i18n.js` |
| Schema | `migrations/001` through `004`; never edit an applied migration |
| Operator tools | `scripts/database.ts`, `scripts/import-catalog.ts` |

Persistence loads a small branch's working set inside a branch-row lock, rechecks authorization, and atomically saves changes/audit/outbox. This deliberately coarse POC design is not unlimited-scale storage or database RLS. Tokens expire after seven days; owners/operators mutate their branch, viewers read only. Real customer staging still needs operational hardening and least-privilege DB identities.

Queue behavior: PostgreSQL Cloud ingress commits a unique job before ACK. Processing commits domain effects/cached reply/reply-pending state together. Network sends follow a committed claim. Explicit provider rejections retry with backoff, up to five attempts. Unknown outcomes and expired send claims become `needs_attention`; do not blindly replay them. Later messages from that conversation wait, unrelated conversations can proceed. Provider acceptance is not device delivery. Memory mode remains synchronous and test-only. `/api/whatsapp/delivery` exposes authenticated branch-scoped queue counts without message/contact contents.

Last passing baseline: `npm run check`; 16 application tests; 12 PostgreSQL subtests plus parent (13 TAP results); CI green for merged #29. Local browser rehearsal completed a synthetic CLP 4,500 pay-at-pickup order, checked both languages and recovered the collected order after server restart. These are local/fixture results, not a real WhatsApp or vendor kitchen rehearsal.

## Cloud delivery evidence: 28 October 2026

The cloud checkout began at current `main` commit `0b4070001a734fc6cc66ba630ea78c1ce4a166ab`. This delivery adds migration 005 and authenticated redacted WhatsApp recovery: known failed jobs can be retried; uncertain sends require explicit review without resend and never become delivery receipts. See `docs/whatsapp-recovery.md`. The original PostgreSQL suite passed 13 TAP results and the recovery suite passed six results. The database script selects all `*.integration.ts` files so new coverage runs in CI.

A disconnected Webpay sandbox adapter follows the official Transbank Node SDK contract at `52ad60075ce7d9eacf7f8cc42a795ae43bd483ff`. Five local mock HTTP tests pass for create/commit/status, mismatches, declines, ambiguous errors and hostile inputs. This is boundary coverage only: no actual sandbox checkout, application checkout flow or settlement is proved by this slice.

`scripts/rehearse-demo.ts` exercises real local HTTP processes in Spanish and English for local pay at pickup and both simulated POS labels. See `docs/operations-rehearsal.md` for execution, feedback, staging/rollback and privacy gates. Baseline type checks, 16 application tests, committed context hash checks and an independent HTTP CLP 11,500 ordering/collection rehearsal passed before implementation.

Git HTTPS reads work. The public GitHub issue listing was read on 28 October and showed the outstanding pilot issues open; REST and GraphQL calls to `api.github.com` were denied by the runtime proxy. The required domain was saved in the environment draft, but draft saving does not apply runtime policy. Live issue comments/criteria updates remain blocked; `docs/issue-evidence.md` contains pending truthful updates. No issue is claimed updated or closed. Installation/start instructions were saved for review; publication and fresh-task restoration are not verified.

## Integrated cloud pilot slice: local validation

Migrations 006–008 add opt-in staff-assisted Webpay integration checkout/local kitchen, full test reversal with owner/revision claims, signed reply/notification receipt evidence, verified customer-service windows, transactional pickup notifications and human handoff. Browser returns never authorize payment. Unknown creation/commit/reversal outcomes never retry automatically; partial reversals and uncertain refunds block fulfillment for review. Sandbox totals are separate from paid revenue. See `docs/webpay-sandbox.md`, `docs/whatsapp-delivery-status.md` and `docs/whatsapp-support.md`.

Local validation: 28 application tests, 43 database TAP results, type/browser syntax checks, three ES/EN real-HTTP rehearsal modes, Chromium owner/operator/viewer ES/EN checks on desktop/mobile, sandbox POST handoff and owner full reversal using a fake gateway, and a disposable custom-format PostgreSQL backup/restore all pass. Restored migration checksums, synthetic order/payment state, audit records and scoped viewer restrictions were checked. Screenshots and browser harnesses remain outside the checkout in `/workspace/.browser-tools`; they contain synthetic data and are local evidence, not a portable CI browser suite.

Final packaged image `sha256:64ddab4fa56c48f6a4be47ca4d6ae7a111aac480e63ca284dce29d2c15779c47` passed nonroot startup, health/assets/auth and the CLP 11,500 ordering/payment/collection journey. Build trust uses an optional BuildKit CA secret and existing proxy; no verification bypass, CA file or proxy credential is retained in the image. Private checkout modes required explicit `COPY --chown=node:node` ownership. No cloud resources were provisioned. The restore test used disposable databases and does not establish production backup recovery.

Default memory/console startup is prepared. The environment draft stores installation/start instructions, required API/integration domains and optional sandbox configuration requirements without values. Review/save and publication remain user actions; fresh-task restoration has not been verified. Actual Webpay hosted acceptance is blocked by integration-host proxy denial and absent approved HTTPS/runtime credentials. Meta recipient/sender/webhook acceptance, Toteat/Fudo restaurant contracts and kitchens, merchant settlement, restaurant feedback, retention/deletion policy and hosting/budget ownership remain external gates. No real messages, payments, refunds or vendor orders were sent. Production simulation controls and production refunds remain future reviewed deployment work, not a completed pilot claim.

GitHub public issue pages were readable; API requests remained denied by the runtime proxy. Pending issue updates are preserved in `docs/issue-evidence.md`; no live criterion or issue closure is claimed. `docs/pos-readiness.md` and synthetic POS-boundary tests distinguish implemented local port behavior from unverified vendor contracts.

## Main integration and issue closure review: 29 October 2026

The owner explicitly authorized merging all prepared changes to main. After fresh type/browser syntax checks, 28 application tests, 43 PostgreSQL TAP results and context freshness passed, a normal non-force Git fast-forward advanced remote `main` from `0b40700` to `79e6483`. Git read-back verified that main contained the complete pilot-readiness branch. No PR was created or merged through the API; REST/GraphQL still returned proxy Forbidden. This integration was not a deployment or proof of current GitHub Actions conclusions.

Issue #12 is complete at the implementation scope: durable bilingual human-help paths (including rejected-order requests), state-derived pickup notifications, verified service-window enforcement with staff fallback, and rejection/ambiguity/late-readiness/privacy tests. A targeted signed rejected-order request also verified durable handoff, scoped staff visibility and replay deduplication with a fake transport. It is ready for the owner to close locally after adding the implementation evidence. Actual phone acceptance remains in #9/#27 and is not claimed by closing this implementation issue. Issues #5/#6 were already closed. The other open issues retain incomplete state, checkout delivery, provider, reconciliation, staging, policy or restaurant criteria; no milestone qualifies for closure.

No issue or milestone was closed by this cloud task. See `docs/completed-issues.md` for the owner’s local CLI command. Earlier PR-only instructions below are historical and are superseded by the owner’s explicit normal-Git integration authorization. Do not create a redundant PR for changes already contained in main.

## Published Git branch and review status

Implementation commits `985e7de` and `65167d5` were pushed to `codex/pilot-readiness`. The checkout is based on verified `main` commit `0b4070001a734fc6cc66ba630ea78c1ce4a166ab`; main was not changed or merged. Draft PR creation was attempted with the prepared description and failed at the GitHub GraphQL proxy with Forbidden. No PR URL or live issue update is claimed. The branch is available for review; pending issue evidence remains in `docs/issue-evidence.md`. The local environment configuration is saved as a draft and still requires user review/save and publication.

## External access and blockers: do not invent missing facts

### Meta / WhatsApp

The founder initially had only a WhatsApp Business mobile app. They subsequently created Facebook/developer access, the Arkaive Studio business portfolio, and an Easy Eatery app with the WhatsApp use case. The Meta console displayed a test sender and a temporary token. The official WhatsApp Business Tools MCP was configured and OAuth login succeeded on the founder's desktop; a business-list call verified access.

Last observed MCP result: the business was **not verified** and its **profile was incomplete**. These are separate statuses. The founder says legal company registration is pending and explicitly defers business verification. Do not invent legal/tax/address details, submit verification, buy a subscription, or migrate/deregister the existing mobile number.

Do not assume an unverified business necessarily prevents every test-sender operation. Recheck actual account eligibility, profile prerequisites and the specific console/API response. Use the test sender if legitimately supported. Respect a genuine prerequisite error; continue fake-transport development independently. Recipient verification, a real inbound/outbound ordering loop, public webhook subscription and ready notifications have **not** been proved.

Official MCP guide: `https://developers.facebook.com/documentation/mcp/whatsapp-business-tools-mcp`; endpoint `https://mcp.facebook.com/whatsapp_business_tools` (Streamable HTTP + OAuth). It manages/debugs developer assets; the product runtime calls Cloud API directly. Follow the connected MCP's business-picker rules: list businesses first, show results and obtain an explicit selection even if one exists; inspect profile prerequisites before onboarding. Never auto-select assets or automatically grant broad permissions.

A cloud worker does not inherit desktop browser cookies, temporary tokens, OAuth/keychain storage, Codex user configuration, localhost callbacks or MCP registrations. Discover its actual tools; ask the owner to reconnect only when needed. Store runtime secrets in the cloud environment's secret facility, never in Git/graphs/issues/chat. The founder prefers to personally accept terms and complete password/OTP/CAPTCHA/security-sensitive grants. Do not request passwords in chat. No Twilio account is needed for the existing direct-Meta adapter.

### Toteat and Fudo

There are no approved restaurant accounts/test branches/credentials or restaurant-side kitchen acceptance evidence. A public developer login is not equivalent to approved external-order access. Do not spend engineering time fabricating authentication or order contracts.

Prior research (revalidate authoritative docs before coding): Toteat owner configuration exposes restaurant/local/user identifiers, API enablement and external-order settings. Fudo external-order integration requires its separate approved workflow and Delivery capability; general-purpose data API access does not establish order-injection permission. Generic payment fields do not establish hosted-checkout-link capability for either vendor.

Sources: `https://developers.toteat.com/tags/config_tag.yaml`, `https://developers.toteat.com/toteatApi_v2.yaml`, `https://soporte.fu.do/es/articles/15707531-integracion-de-pedidos-externos-via-apis`, `https://soporte.fu.do/es/articles/11939789-api-publica-de-proposito-general`.

Can complete now: common adapter boundaries, scoped configuration validation, mock-server harness, explicitly synthetic contract fixtures, duplicate/timeout/error tests, capability matrix and operator runbooks. Implement actual request formats only where current official/authorized contracts support them. Fail closed in real mode without approved configuration. Never call a synthetic fixture a vendor contract test or mark provider acceptance complete.

Blocked until owner/vendor access: approved authentication/permissions, actual catalog IDs/modifiers/payment mappings/shift behavior, test order injection, correlation lookup/idempotency proof, callbacks and correct restaurant KDS/Delivery pickup routing. Draft access questions for the Chile partner; do not send vendor emails or make commitments without explicit authorization.

### Hosted checkout

Webpay Plus sandbox is the preferred independent test gateway. Its official Node example uses published integration credentials; a production merchant account is a separate gate. `https://proyecto-ejemplo-node.transbankdevelopers.cl/webpay-plus` and `/api-reference/webpay-plus` describe creation, POST `token_ws` handoff, commit/status and reversal. Verify the current SDK/API version and official test-card data before use.

A synthetic transaction-create probe from the desktop network returned HTTP 403 with an Incapsula security page, before API JSON. No checkout token/payment was obtained. This is an unresolved connectivity result, not proof that a merchant account is required or that a particular country is blocked. A normal approved cloud test environment may be checked; do not bypass a security challenge, rotate evasive proxies, disable TLS validation or substitute a fake success.

Build the adapter and approval/rejection/cancel/expiry/replay tests with a mock server now. A real sandbox success remains externally unverified until it actually happens. Use a server-priced immutable attempt, opaque expiring application checkout link, allowlisted provider URL, POST handoff, persisted token/order/session/environment, and authoritative server-side commit/status validation. A browser return URL or demo pay endpoint cannot authorize payment. Never collect card data in Easy Eatery. Sandbox authorization must be separate from actual money received.

### Restaurant, hosting and operations

No pilot restaurant, approved menu/hours/pickup promise, merchant settlement account or actual staff sign-off exists. Do not invent them. Production receipts must settle to the authorized restaurant merchant. Production financial transactions, refunds, billing and legal commitments require the owner and actual provider approval.

Architecture targets hosting near Chile (existing plan: Santiago). Prepare deployment/IaC, rollback, secrets, database/worker lifecycle, health checks, redacted logs and cost estimates now. Cloud project access and an approved spending cap have not been provided. Do not provision paid infrastructure or expose staff/demo routes publicly by default. Localhost services/tokens on the founder's computer are not available in cloud jobs.

## Orchestrate independent work in parallel

Use up to 3–4 implementation agents when available, plus the orchestrator/reviewer if the host supports it. Scale down to actual capacity. Give each agent a bounded outcome, owned paths, source/issue references, invariants and verification commands. Ask for a commit/diff, tests and unresolved assumptions. Agents may report progress to the orchestrator through supported collaboration tools; this does not authorize contacting third parties.

| Workstream | Scope and issues | Completion evidence now | External acceptance later |
| --- | --- | --- | --- |
| Messaging reliability / staff handoff | #10–#12: delivery callbacks, unknown-media/status batches, retention policy, dead-letter/recovery UX, permitted ready notifications, human help | Signed callback fixtures, state-ordering/replay/failure tests, auth/isolation, ES/EN staff flows; no blind resend of unknown outcomes | Approved recipient and actual phone journey; approved utility template outside service window |
| Checkout / financial orchestration | #8/#14/#15/#17 and local slice #27: durable attempts, separate financial/fulfillment states, Webpay sandbox adapter, cancellation/late payment/reconciliation | Mock gateway tests, immutable total checks, duplicate callbacks, concurrent workers, unknown outcomes, safe cash-vs-online choices, clear sandbox UI | Reachable hosted sandbox; merchant settlement/refund contract for real money |
| POS contract readiness | #2/#3/#7/#13/#16/#22/#23: Toteat/Fudo capability matrix, adapters where contract is known, synthetic harness and fail-closed configuration | Two isolated provider configurations, routing/mapping/error tests, exact evidence labels and access checklist | Approved accounts/contracts and real kitchen confirmation in each provider |
| Demo / deployment / operations | #18–#21/#27: bilingual dashboard/recovery, staging recipe, local acceptance scripts, privacy/runbooks and customer feedback kit | Reproducible build, isolated PG tests, keyboard/mobile ES/EN rehearsal, deployment/rollback checks without paid provisioning | Restaurant ownership/sign-off, cloud/budget authorization, real traffic go/no-go |

Allocate migrations and shared contracts to one owner at a time. Reserve migration numbers centrally. Sequence changes to `domain.ts`, `database.ts`, `app.ts` and `contracts.ts`; independent agents should not concurrently rewrite them. Use an integration branch with exclusive file ownership in this isolated cloud checkout, or sequential cherry-picks; never use shared uncoordinated edits. Do not create worktrees during cloud setup unless explicitly requested. Re-run the relevant integration suite after combining changes. A reviewer should examine payment authority, tenant isolation, message/order duplication, unknown outcomes and truthful statuses.

Recommended order: finish messaging recovery/status handling and financial state contracts; implement independent sandbox checkout; add ready notifications and staff exception flows; prepare staging and scripted bilingual rehearsal; continue POS readiness concurrently without claiming vendor acceptance. M0–M4 are outcome groups, not a requirement to finish all vendor approvals before writing independent code. #27 is the first standalone demo target; #21/#23 contain later restaurant/both-provider gates.

## Cloud bootstrap and validation

```sh
# Clone the repository and start from current main in your authorized checkout.
npm ci
npm run check
npm test
# Use a disposable PostgreSQL 17 instance supplied by the cloud task/CI.
# Set TEST_DATABASE_URL through the environment; do not use production DATABASE_URL.
npm run test:db
# Validate committed context hashes without Graphify/Python extras:
python3 scripts/update-context.py --check
```

Read `.env.example`, `README.md`, `docs/postgres-storage.md` and scoped guides for actual startup/migrations/seed/token commands. Database tests create/drop their own random schema. Never run seed or staff issuance just to discover context. Local pickup branch configuration is explicit; existing confirmed orders retain their method when branch defaults change. The sample catalog contains synthetic POS IDs.

Run type/syntax and domain tests for changes; run PostgreSQL integration for migrations, persistence, callbacks, replay or scope changes. Use fake external transports in CI. For visible UI changes verify both languages, keyboard/mobile and save non-sensitive evidence. Test the packaged image when deployment/runtime packaging changes. Do not run real messages or real-money payments as an automated CI check.

## Evidence and completion contract

Maintain GitHub issues with checked implementation criteria and linked PR/test evidence. Keep an issue open when some acceptance gates remain blocked. Do not close #7 because its canonical importer exists, #10 because only fixtures pass, or #27/#21 because browser simulation succeeds. Update `backlog.json`, `backlog.md` and the handoff with matching status.

At each delivery boundary report: merged/open PRs and exact commits; tests and their limits; demo instructions; which integrations are simulation/mock/sandbox/real; blockers with owner and exact needed input; and the next independent task. Snapshot new product decisions in `docs/context-decisions.json` and this brief, update the relevant guides, refresh canonical graph/source hashes, and commit them with the change.

Stop at a truthful readiness boundary:

1. **Local prospect demo:** bilingual synthetic ordering, persisted local kitchen/pay-at-pickup, staff roles, coherent totals and recovery. Implemented baseline; preserve and improve it.
2. **Real-phone prospect demo:** verified recipient, real inbound/menu/cart/confirm, durable delivery, local kitchen/ready/collection, public HTTPS and redacted evidence. Still unproved.
3. **Hosted sandbox demo:** authoritative provider test approval/rejection/cancel handling and one local kitchen ticket. Still unproved.
4. **Restaurant pilot:** approved restaurant/menu/operations, correct selected POS kitchen routing, authorized sender and settlement, privacy/recovery/staging ownership and sign-off. Externally gated. Both-provider support requires distinct Toteat and Fudo acceptance evidence.

If a cloud run cannot satisfy the next external gate, finish all independent scoped work, leave safe runnable defaults, and provide a concise blocker matrix. Do not repeat blocked account setup or mislabel the whole pilot complete.

## 30 October 2026: original source import and local loyalty request

The founder supplied the complete original specification archive and matching standalone README. All 19 archived Markdown documents, the original manifest and separate README are preserved under [the source index](sources/original-platform-specs/INDEX.md), with byte-level checksums and provenance. Read current adaptations there before implementing historical framework proposals. Preserve the current Fastify/Node 24/native browser stack.

The founder now requests a local loyalty demo: source MVP-A staff ledger first, with unfinished MVP-B Google Wallet and MVP-C POS integrations explicitly simulated. The source import itself adds no loyalty implementation or new acceptance evidence. Start the loyalty demo only after the separate tested code handoff; keep it loopback-only and use synthetic data. Do not publish externally or infer real-provider approval.

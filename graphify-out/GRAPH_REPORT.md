# Graph Report - easy-eatery  (2026-10-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 603 nodes · 1684 edges · 26 communities (22 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `79e64835`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community -1
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24

## God Nodes (most connected - your core abstractions)
1. `Blocker: Webpay sandbox creation received security-page HTTP 403; no successful hosted checkout yet` - 42 edges
2. `docs/cloud-agent-handoff.md: Verified implementation baseline` - 40 edges
3. `tests/AGENTS.md: Verification map` - 40 edges
4. `Implemented: durable WhatsApp jobs; uncertain sends pause for review, not blind replay` - 33 edges
5. `createApp()` - 32 edges
6. `Invariant: Spanish default plus complete English testing; CLP integer totals and Santiago dates` - 32 edges
7. `PostgresRepository` - 31 edges
8. `MemoryStore` - 31 edges
9. `DomainError` - 30 edges
10. `Evidence: local sandbox authority, permitted messaging, browser/image and disposable restore checks` - 30 edges

## Surprising Connections (you probably didn't know these)
- `AGENTS.md: Shared constraints and checks` --references--> `TEST_DATABASE_URL`  [EXTRACTED]
  AGENTS.md → .github/workflows/ci.yml
- `tests/AGENTS.md: Verification map` --references--> `name`  [EXTRACTED]
  tests/AGENTS.md → .github/workflows/ci.yml
- `tests/AGENTS.md: Verification map` --references--> `push`  [EXTRACTED]
  tests/AGENTS.md → .github/workflows/ci.yml
- `tests/AGENTS.md: Verification map` --references--> `pull_request`  [EXTRACTED]
  tests/AGENTS.md → .github/workflows/ci.yml
- `tests/AGENTS.md: Verification map` --references--> `contents`  [EXTRACTED]
  tests/AGENTS.md → .github/workflows/ci.yml

## Import Cycles
- None detected.

## Communities (26 total, 4 thin omitted)

### Community -1 - "Community -1"
Cohesion: 0.15
Nodes (25): .github/AGENTS.md: CI and contribution automation, AGENTS.md: Easy Eatery repository guide, AGENTS.md: Retrieve context, AGENTS.md: Shared constraints and checks, AGENTS.md: Required context lifecycle, README.md: Agent context and cloud handoff, docs/cloud-agent-handoff.md: Start here: Git → graph → scoped guide → targeted source, docs/cloud-agent-handoff.md: Validate committed context hashes without Graphify/Python extras: (+17 more)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (30): { app, queue }, CloudWhatsAppTransport, customerWindowOpen(), DeliveryStatus, Inbound, parseDeliveryStatuses(), parseMessages(), validSignature() (+22 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (50): createApp(), DemoPaymentProvider, DemoPosProvider, PaymentProvider, PosProvider, Conversation, Availability, cartSelection() (+42 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (24): payment(), SandboxAttempt, SandboxPayment, SandboxStatus, text(), token(), WebpaySandbox, WebpaySandboxError (+16 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (44): dependencies, fastify@^5.6.1, pg@^8.23.1, devDependencies, tsx@^4.20.0, @types/node@^24.0.0, @types/pg@^8.23.1, typescript@^5.9.0 (+36 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (29): README.md: Cloud pilot implementation slices, Evidence: pilot changes integrated into main by authorized normal fast-forward, Authorization: cloud orchestrator may spawn bounded specialist subagents and finish independent pilot work, docs/cloud-agent-handoff.md: Easy Eatery: cloud orchestrator handoff, docs/cloud-agent-handoff.md: External access and blockers: do not invent missing facts, docs/cloud-agent-handoff.md: Meta / WhatsApp, docs/cloud-agent-handoff.md: Toteat and Fudo, docs/cloud-agent-handoff.md: Hosted checkout (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (15): WhatsAppTransport, Identity, WhatsAppQueue, WhatsAppStatuses, handoffReason(), Kind, notificationText(), Reason (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (29): api(), bubble(), catalogPanel, element(), formatMoney(), guard(), refresh(), renderDashboard() (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (31): runs-on, services, steps, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, TEST_DATABASE_URL, jobs (+23 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (26): access_tokens, audit_events, branches, channel_accounts, conversations, inbox, memberships, order_lines (+18 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (16): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, environment (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (15): docs/live-demo-onboarding.md: Live-demo onboarding plan, docs/live-demo-onboarding.md: 8. Engineering execution and exit evidence, docs/live-demo-onboarding.md: 9. Spanish support drafts—prepared, not sent, docs/live-demo-onboarding.md: Toteat, docs/live-demo-onboarding.md: Fudo, docs/live-demo-onboarding.md: 10. First handoff, docs/live-demo-onboarding.md: Implementation progress — local pay-at-pickup slice, docs/live-demo-onboarding.md: 2. What you provide first—without secrets in chat (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (11): compilerOptions, allowImportingTsExtensions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noEmit, skipLibCheck (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (10): label, placeholder, body, attributes, id, type, validations, description (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (7): docs/catalog-and-availability.md: Shared catalog, availability and manual import (#7), docs/catalog-and-availability.md: Canonical file import, docs/catalog-and-availability.md: Implemented scope and provider gate, docs/catalog-and-availability.md: Customer selection and safe confirmation, docs/catalog-and-availability.md: Availability rules, docs/catalog-and-availability.md: HTTP surface, docs/catalog-and-availability.md: Staff controls

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (8): docs/architecture.md: Architecture and deployment, docs/architecture.md: Durable model to implement in M1/M2, docs/architecture.md: Runtime boundaries, docs/architecture.md: Payment and fulfillment contracts, docs/architecture.md: Regional deployment target, docs/architecture.md: Observability and required verification, docs/architecture.md: PostgreSQL and access implementation (#6), docs/architecture.md: Catalog and availability extension (#7)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (8): docs/product-and-milestones.md: Product direction and POC milestones, docs/product-and-milestones.md: Commercial modularity, docs/product-and-milestones.md: What is complete in this change, docs/product-and-milestones.md: Delivery gates, docs/product-and-milestones.md: Scope update: prospect demo before restaurant onboarding, docs/product-and-milestones.md: Suggested two-person division, docs/product-and-milestones.md: First pilot release essentials, docs/product-and-milestones.md: First outcome

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (7): docs/integrations.md: Integration decisions and test setup, docs/integrations.md: Toteat, docs/integrations.md: Fudo, docs/integrations.md: Hosted checkout gate, docs/integrations.md: WhatsApp test-account setup, docs/integrations.md: Provider parity gate, docs/integrations.md: Capability matrix

### Community 17 - "Community 17"
Cohesion: 0.29
Nodes (6): docs/github-reconciliation.md: GitHub reconciliation handoff for the local Mac, docs/github-reconciliation.md: Required PR workflow, docs/github-reconciliation.md: Concrete issue updates, docs/github-reconciliation.md: Integration update, docs/github-reconciliation.md: Milestone decision, docs/github-reconciliation.md: Current access and repository evidence

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (5): docs/demo-and-pilot.md: Customer demo and pilot acceptance, docs/demo-and-pilot.md: Sandbox acceptance before live pilot, docs/demo-and-pilot.md: Five-minute discovery demo (available now), docs/demo-and-pilot.md: Pilot go/no-go, docs/demo-and-pilot.md: Validation record for this foundation

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (5): docs/issue-evidence.md: Pending GitHub delivery evidence, docs/issue-evidence.md: Issues #14, #15, #17 and #27: sandbox checkout and local fulfillment, docs/issue-evidence.md: Issues #13, #22 and #23: POS readiness, docs/issue-evidence.md: Issues #18, #19, #20 and #21: local operations evidence, docs/issue-evidence.md: Issues #10 and #12: delivery, staff handoff and notifications

### Community 20 - "Community 20"
Cohesion: 0.40
Nodes (4): docs/webpay-sandbox.md: Staff-assisted Webpay sandbox checkout, docs/webpay-sandbox.md: Rehearse the flow, docs/webpay-sandbox.md: Full test reversals and exceptions, docs/webpay-sandbox.md: Evidence and gates

## Knowledge Gaps
- **111 isolated node(s):** `AGENTS.md: Easy Eatery repository guide`, `README.md: Easy Eatery`, `README.md: Run the demo`, `README.md: Durable WhatsApp message processing`, `README.md: Read next` (+106 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 175 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `migrations/AGENTS.md: Database schema history` connect `Community 0` to `Community 8`, `Community 2`, `Community 13`, `Community 5`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `createApp()` (e.g. with `.acceptPickup()` and `.dashboard()`) actually correct?**
  _`createApp()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `AGENTS.md: Easy Eatery repository guide`, `README.md: Easy Eatery`, `README.md: Run the demo` to the rest of the system?**
  _111 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community -1` be split into smaller, more focused modules?**
  _Cohesion score 0.14793741109530584 - nodes in this community are weakly interconnected._
- **Why does `docs/cloud-agent-handoff.md: Verified implementation baseline` connect `Community 6` to `Community 0`, `Community 1`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08922621251388374 - nodes in this community are weakly interconnected._
- **Why does `tests/AGENTS.md: Verification map` connect `Community 7` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
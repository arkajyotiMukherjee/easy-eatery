# Graph Report - easy-eatery  (2026-10-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 440 nodes · 1104 edges · 22 communities (20 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `85cc1c3d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- update-context.py
- app.ts
- domain.ts
- Implemented: durable WhatsApp jobs; uncertain sends pause for review, not blind replay
- tests/AGENTS.md: Verification map
- docs/AGENTS.md: Product and architecture documentation
- createApp
- docs/cloud-agent-handoff.md: Verified implementation baseline
- 001_restaurant_storage.sql
- postgres
- docs/cloud-agent-handoff.md
- docs/live-demo-onboarding.md
- compilerOptions
- body
- docs/catalog-and-availability.md
- docs/architecture.md
- docs/product-and-milestones.md
- docs/integrations.md
- createCatalogPanel
- docs/demo-and-pilot.md
- server/AGENTS.md
- docs/backlog.md

## God Nodes (most connected - your core abstractions)
1. `docs/cloud-agent-handoff.md: Verified implementation baseline` - 38 edges
2. `tests/AGENTS.md: Verification map` - 34 edges
3. `Invariant: Spanish default plus complete English testing; CLP integer totals and Santiago dates` - 32 edges
4. `Implemented: durable WhatsApp jobs; uncertain sends pause for review, not blind replay` - 30 edges
5. `DomainError` - 28 edges
6. `docs/AGENTS.md: Product and architecture documentation` - 27 edges
7. `MemoryStore` - 26 edges
8. `migrations/AGENTS.md: Database schema history` - 24 edges
9. `createApp()` - 23 edges
10. `OrderingService` - 22 edges

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

## Communities (22 total, 2 thin omitted)

### Community -1 - "update-context.py"
Cohesion: 0.20
Nodes (19): .github/AGENTS.md: CI and contribution automation, AGENTS.md: Easy Eatery repository guide, AGENTS.md: Retrieve context, AGENTS.md: Shared constraints and checks, AGENTS.md: Required context lifecycle, README.md: Agent context and cloud handoff, docs/cloud-agent-handoff.md: Start here: Git → graph → scoped guide → targeted source, docs/cloud-agent-handoff.md: Validate committed context hashes without Graphify/Python extras: (+11 more)

### Community 0 - "app.ts"
Cohesion: 0.17
Nodes (9): { app, queue }, CloudWhatsAppTransport, Inbound, parseMessages(), validSignature(), WhatsAppDeliveryError, apps/server/src/AGENTS.md: HTTP boundary and runtime composition, Blocker: Meta legal business verification deferred; profile completion is a separate prerequisite (+1 more)

### Community 1 - "domain.ts"
Cohesion: 0.10
Nodes (34): Conversation, Availability, cartSelection(), CatalogImport, CatalogMeta, CatalogService, integer(), item() (+26 more)

### Community 2 - "Implemented: durable WhatsApp jobs; uncertain sends pause for review, not blind replay"
Cohesion: 0.16
Nodes (16): AccessError, databasePool(), Identity, issueStaffToken(), migrate(), PostgresRepository, Role, Scope (+8 more)

### Community 3 - "tests/AGENTS.md: Verification map"
Cohesion: 0.09
Nodes (34): runs-on, services, steps, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, TEST_DATABASE_URL, jobs (+26 more)

### Community 4 - "docs/AGENTS.md: Product and architecture documentation"
Cohesion: 0.10
Nodes (34): dependencies, fastify@^5.6.1, pg@^8.23.1, devDependencies, tsx@^4.20.0, @types/node@^24.0.0, @types/pg@^8.23.1, typescript@^5.9.0 (+26 more)

### Community 5 - "createApp"
Cohesion: 0.21
Nodes (14): createApp(), DemoPaymentProvider, DemoPosProvider, PaymentProvider, PosProvider, WhatsAppTransport, Order, OrderingService (+6 more)

### Community 6 - "docs/cloud-agent-handoff.md: Verified implementation baseline"
Cohesion: 0.17
Nodes (22): api(), bubble(), catalogPanel, element(), formatMoney(), guard(), refresh(), renderDashboard() (+14 more)

### Community 7 - "001_restaurant_storage.sql"
Cohesion: 0.13
Nodes (24): access_tokens, audit_events, branches, channel_accounts, conversations, inbox, memberships, order_lines (+16 more)

### Community 8 - "postgres"
Cohesion: 0.12
Nodes (16): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, environment (+8 more)

### Community 9 - "docs/cloud-agent-handoff.md"
Cohesion: 0.12
Nodes (15): Authorization: cloud orchestrator may spawn bounded specialist subagents and finish independent pilot work, docs/cloud-agent-handoff.md: Easy Eatery: cloud orchestrator handoff, docs/cloud-agent-handoff.md: Restaurant, hosting and operations, docs/cloud-agent-handoff.md: Orchestrate independent work in parallel, docs/cloud-agent-handoff.md: Cloud bootstrap and validation, docs/cloud-agent-handoff.md: Clone the repository and start from current main in your authorized checkout., docs/cloud-agent-handoff.md: Use a disposable PostgreSQL 17 instance supplied by the cloud task/CI., docs/cloud-agent-handoff.md: Set TEST_DATABASE_URL through the environment; do not use production DATABASE_URL. (+7 more)

### Community 10 - "docs/live-demo-onboarding.md"
Cohesion: 0.12
Nodes (15): docs/live-demo-onboarding.md: Live-demo onboarding plan, docs/live-demo-onboarding.md: 8. Engineering execution and exit evidence, docs/live-demo-onboarding.md: 9. Spanish support drafts—prepared, not sent, docs/live-demo-onboarding.md: Toteat, docs/live-demo-onboarding.md: Fudo, docs/live-demo-onboarding.md: 10. First handoff, docs/live-demo-onboarding.md: Implementation progress — local pay-at-pickup slice, docs/live-demo-onboarding.md: 2. What you provide first—without secrets in chat (+7 more)

### Community 11 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, allowImportingTsExtensions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noEmit, skipLibCheck (+3 more)

### Community 12 - "body"
Cohesion: 0.18
Nodes (10): label, placeholder, body, attributes, id, type, validations, description (+2 more)

### Community 13 - "docs/catalog-and-availability.md"
Cohesion: 0.22
Nodes (7): docs/catalog-and-availability.md: Shared catalog, availability and manual import (#7), docs/catalog-and-availability.md: Canonical file import, docs/catalog-and-availability.md: Implemented scope and provider gate, docs/catalog-and-availability.md: Customer selection and safe confirmation, docs/catalog-and-availability.md: Availability rules, docs/catalog-and-availability.md: HTTP surface, docs/catalog-and-availability.md: Staff controls

### Community 14 - "docs/architecture.md"
Cohesion: 0.22
Nodes (8): docs/architecture.md: Architecture and deployment, docs/architecture.md: Runtime boundaries, docs/architecture.md: Durable model to implement in M1/M2, docs/architecture.md: Payment and fulfillment contracts, docs/architecture.md: Regional deployment target, docs/architecture.md: Observability and required verification, docs/architecture.md: PostgreSQL and access implementation (#6), docs/architecture.md: Catalog and availability extension (#7)

### Community 15 - "docs/product-and-milestones.md"
Cohesion: 0.22
Nodes (8): docs/product-and-milestones.md: Product direction and POC milestones, docs/product-and-milestones.md: Commercial modularity, docs/product-and-milestones.md: What is complete in this change, docs/product-and-milestones.md: Delivery gates, docs/product-and-milestones.md: Scope update: prospect demo before restaurant onboarding, docs/product-and-milestones.md: Suggested two-person division, docs/product-and-milestones.md: First pilot release essentials, docs/product-and-milestones.md: First outcome

### Community 16 - "docs/integrations.md"
Cohesion: 0.25
Nodes (7): docs/integrations.md: Integration decisions and test setup, docs/integrations.md: Toteat, docs/integrations.md: Fudo, docs/integrations.md: Hosted checkout gate, docs/integrations.md: WhatsApp test-account setup, docs/integrations.md: Provider parity gate, docs/integrations.md: Capability matrix

### Community 17 - "createCatalogPanel"
Cohesion: 0.73
Nodes (6): createCatalogPanel(), editItem(), load(), mutate(), received(), render()

### Community 18 - "docs/demo-and-pilot.md"
Cohesion: 0.33
Nodes (5): docs/demo-and-pilot.md: Customer demo and pilot acceptance, docs/demo-and-pilot.md: Sandbox acceptance before live pilot, docs/demo-and-pilot.md: Five-minute discovery demo (available now), docs/demo-and-pilot.md: Pilot go/no-go, docs/demo-and-pilot.md: Validation record for this foundation

## Knowledge Gaps
- **79 isolated node(s):** `AGENTS.md: Easy Eatery repository guide`, `README.md: Easy Eatery`, `README.md: Run the demo`, `README.md: Durable WhatsApp message processing`, `README.md: Read next` (+74 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 132 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `migrations/AGENTS.md: Database schema history` connect `Implemented: durable WhatsApp jobs; uncertain sends pause for review, not blind replay` to `app.ts`, `docs/catalog-and-availability.md`, `001_restaurant_storage.sql`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **What connects `AGENTS.md: Easy Eatery repository guide`, `README.md: Easy Eatery`, `README.md: Run the demo` to the rest of the system?**
  _79 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `domain.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09994711792702274 - nodes in this community are weakly interconnected._
- **Why does `docs/cloud-agent-handoff.md: Verified implementation baseline` connect `docs/cloud-agent-handoff.md: Verified implementation baseline` to `app.ts`, `domain.ts`, `Implemented: durable WhatsApp jobs; uncertain sends pause for review, not blind replay`, `createApp`, `docs/cloud-agent-handoff.md`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Should `tests/AGENTS.md: Verification map` be split into smaller, more focused modules?**
  _Cohesion score 0.09309309309309309 - nodes in this community are weakly interconnected._
- **Why does `tests/AGENTS.md: Verification map` connect `tests/AGENTS.md: Verification map` to `app.ts`, `Implemented: durable WhatsApp jobs; uncertain sends pause for review, not blind replay`, `createApp`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Should `docs/AGENTS.md: Product and architecture documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.10476190476190476 - nodes in this community are weakly interconnected._
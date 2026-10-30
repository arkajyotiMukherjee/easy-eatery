# Graph Report - easy-eatery-pilot  (2026-10-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 677 nodes · 1320 edges · 42 communities (37 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6b94c431`
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
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40

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
- `docs/sources/original-platform-specs/restaurant-platform-specs/16-shared-domain-and-event-contracts.md: 2. Canonical core entities` --references--> `Conversation`  [EXTRACTED]
  docs/sources/original-platform-specs/restaurant-platform-specs/16-shared-domain-and-event-contracts.md → apps/server/src/modules/whatsapp/conversation.ts
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

## Communities (42 total, 5 thin omitted)

### Community -1 - "Community -1"
Cohesion: 0.19
Nodes (19): .github/AGENTS.md: CI and contribution automation, AGENTS.md: Easy Eatery repository guide, AGENTS.md: Retrieve context, AGENTS.md: Required context lifecycle, README.md: Agent context and cloud handoff, docs/cloud-agent-handoff.md: Start here: Git → graph → scoped guide → targeted source, docs/cloud-agent-handoff.md: Validate committed context hashes without Graphify/Python extras:, docs/graphify.md: Portable agent context with Graphify (+11 more)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (24): { app, queue }, CloudWhatsAppTransport, Inbound, parseMessages(), validSignature(), WhatsAppDeliveryError, AccessError, databasePool() (+16 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (33): Conversation, Availability, cartSelection(), CatalogImport, CatalogMeta, CatalogService, integer(), item() (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (34): api(), bubble(), catalogPanel, element(), formatMoney(), guard(), refresh(), renderDashboard() (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (34): access_tokens, audit_events, branches, channel_accounts, conversations, inbox, memberships, order_lines (+26 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (33): dependencies, fastify@^5.6.1, pg@^8.23.1, devDependencies, tsx@^4.20.0, @types/node@^24.0.0, @types/pg@^8.23.1, typescript@^5.9.0 (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (30): runs-on, services, steps, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, TEST_DATABASE_URL, jobs (+22 more)

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (15): createApp(), DemoPaymentProvider, DemoPosProvider, PaymentProvider, PosProvider, WhatsAppTransport, Order, OrderStatus (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (16): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, environment (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (16): Authorization: cloud orchestrator may spawn bounded specialist subagents and finish independent pilot work, docs/cloud-agent-handoff.md: Easy Eatery: cloud orchestrator handoff, docs/cloud-agent-handoff.md: Restaurant, hosting and operations, docs/cloud-agent-handoff.md: Orchestrate independent work in parallel, docs/cloud-agent-handoff.md: Cloud bootstrap and validation, docs/cloud-agent-handoff.md: Clone the repository and start from current main in your authorized checkout., docs/cloud-agent-handoff.md: Use a disposable PostgreSQL 17 instance supplied by the cloud task/CI., docs/cloud-agent-handoff.md: Set TEST_DATABASE_URL through the environment; do not use production DATABASE_URL. (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (16): docs/sources/original-platform-specs/restaurant-platform-specs/02-admin-dashboard-and-ux.md: Restaurant Owner Admin Dashboard & Shared UX, docs/sources/original-platform-specs/restaurant-platform-specs/02-admin-dashboard-and-ux.md: 3. Roles, docs/sources/original-platform-specs/restaurant-platform-specs/02-admin-dashboard-and-ux.md: 1. Purpose, docs/sources/original-platform-specs/restaurant-platform-specs/02-admin-dashboard-and-ux.md: 4. Owner onboarding flow, docs/sources/original-platform-specs/restaurant-platform-specs/02-admin-dashboard-and-ux.md: 5. Home page composition, docs/sources/original-platform-specs/restaurant-platform-specs/02-admin-dashboard-and-ux.md: 6. Core admin pages and interaction patterns, docs/sources/original-platform-specs/restaurant-platform-specs/02-admin-dashboard-and-ux.md: Module catalog, docs/sources/original-platform-specs/restaurant-platform-specs/02-admin-dashboard-and-ux.md: Integrations page (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (15): docs/live-demo-onboarding.md: Live-demo onboarding plan, docs/live-demo-onboarding.md: 8. Engineering execution and exit evidence, docs/live-demo-onboarding.md: 9. Spanish support drafts—prepared, not sent, docs/live-demo-onboarding.md: Toteat, docs/live-demo-onboarding.md: Fudo, docs/live-demo-onboarding.md: 10. First handoff, docs/live-demo-onboarding.md: Implementation progress — local pay-at-pickup slice, docs/live-demo-onboarding.md: 2. What you provide first—without secrets in chat (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (14): docs/sources/original-platform-specs/restaurant-platform-specs/00-product-direction-and-milestones.md: Product Direction & Implementation Milestones, docs/sources/original-platform-specs/restaurant-platform-specs/00-product-direction-and-milestones.md: 8. Risk register, docs/sources/original-platform-specs/restaurant-platform-specs/00-product-direction-and-milestones.md: 9. Decision log format, docs/sources/original-platform-specs/restaurant-platform-specs/00-product-direction-and-milestones.md: 2. Two-person-team delivery rule, docs/sources/original-platform-specs/restaurant-platform-specs/00-product-direction-and-milestones.md: 3. How to choose the first workflow, docs/sources/original-platform-specs/restaurant-platform-specs/00-product-direction-and-milestones.md: 1. Product thesis, docs/sources/original-platform-specs/restaurant-platform-specs/00-product-direction-and-milestones.md: 4. Milestones ordered by value and risk, not by original module numbering, docs/sources/original-platform-specs/restaurant-platform-specs/00-product-direction-and-milestones.md: Rule for moving work between milestones (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (13): docs/sources/original-platform-specs/restaurant-platform-specs/01-platform-architecture.md: Shared Platform Architecture, docs/sources/original-platform-specs/restaurant-platform-specs/01-platform-architecture.md: 9. Data and event consistency, docs/sources/original-platform-specs/restaurant-platform-specs/01-platform-architecture.md: 10. Deployment topology for first customers, docs/sources/original-platform-specs/restaurant-platform-specs/01-platform-architecture.md: 11. What not to build yet, docs/sources/original-platform-specs/restaurant-platform-specs/01-platform-architecture.md: 12. Architecture acceptance criteria, docs/sources/original-platform-specs/restaurant-platform-specs/01-platform-architecture.md: 3. Repository layout, docs/sources/original-platform-specs/restaurant-platform-specs/01-platform-architecture.md: 1. Architectural decision, docs/sources/original-platform-specs/restaurant-platform-specs/01-platform-architecture.md: 4. Logical architecture (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (13): docs/sources/original-platform-specs/restaurant-platform-specs/10-chile-integrations-pos.md: Chile POS Integration Strategy — Toteat and Fudo, docs/sources/original-platform-specs/restaurant-platform-specs/10-chile-integrations-pos.md: 6. Shared `PosAdapter` contract, docs/sources/original-platform-specs/restaurant-platform-specs/10-chile-integrations-pos.md: 7. Sync safety, docs/sources/original-platform-specs/restaurant-platform-specs/10-chile-integrations-pos.md: 2. Connector capability model, docs/sources/original-platform-specs/restaurant-platform-specs/10-chile-integrations-pos.md: 8. Certification checklist before listing a provider as supported, docs/sources/original-platform-specs/restaurant-platform-specs/10-chile-integrations-pos.md: 3. Toteat public API findings, docs/sources/original-platform-specs/restaurant-platform-specs/10-chile-integrations-pos.md: Important Toteat endpoints (verify exact schema in current OpenAPI before coding), docs/sources/original-platform-specs/restaurant-platform-specs/10-chile-integrations-pos.md: 1. Do not pretend market share is known (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (11): docs/sources/original-platform-specs/restaurant-platform-specs/05-module-pickup-ordering.md: Module Specification — Pickup Ordering & Kitchen Dashboard, docs/sources/original-platform-specs/restaurant-platform-specs/05-module-pickup-ordering.md: 2. MVP customer flow, docs/sources/original-platform-specs/restaurant-platform-specs/05-module-pickup-ordering.md: 3. State machines, docs/sources/original-platform-specs/restaurant-platform-specs/05-module-pickup-ordering.md: 1. Product contract, docs/sources/original-platform-specs/restaurant-platform-specs/05-module-pickup-ordering.md: 4. Data model, docs/sources/original-platform-specs/restaurant-platform-specs/05-module-pickup-ordering.md: 5. API sketch, docs/sources/original-platform-specs/restaurant-platform-specs/05-module-pickup-ordering.md: 6. Kitchen dashboard, docs/sources/original-platform-specs/restaurant-platform-specs/05-module-pickup-ordering.md: 7. Scheduling/availability logic (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (11): docs/sources/original-platform-specs/restaurant-platform-specs/06-module-loyalty-and-pos.md: Module Specification — Loyalty, Google Wallet & POS Verification, docs/sources/original-platform-specs/restaurant-platform-specs/06-module-loyalty-and-pos.md: 2. MVP phases, docs/sources/original-platform-specs/restaurant-platform-specs/06-module-loyalty-and-pos.md: 3. Data model, docs/sources/original-platform-specs/restaurant-platform-specs/06-module-loyalty-and-pos.md: 1. Product contract, docs/sources/original-platform-specs/restaurant-platform-specs/06-module-loyalty-and-pos.md: 4. Earning rules, docs/sources/original-platform-specs/restaurant-platform-specs/06-module-loyalty-and-pos.md: 5. Redemption rules, docs/sources/original-platform-specs/restaurant-platform-specs/06-module-loyalty-and-pos.md: 6. Google Wallet implementation, docs/sources/original-platform-specs/restaurant-platform-specs/06-module-loyalty-and-pos.md: 7. POS verification contract (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (11): docs/sources/original-platform-specs/restaurant-platform-specs/07-module-crm.md: Module Specification — Restaurant CRM & Data Aggregation, docs/sources/original-platform-specs/restaurant-platform-specs/07-module-crm.md: 3. Data model, docs/sources/original-platform-specs/restaurant-platform-specs/07-module-crm.md: 1. Product contract, docs/sources/original-platform-specs/restaurant-platform-specs/07-module-crm.md: 4. Identity resolution, docs/sources/original-platform-specs/restaurant-platform-specs/07-module-crm.md: 5. RFM and lifecycle definitions, docs/sources/original-platform-specs/restaurant-platform-specs/07-module-crm.md: 6. Source collection paths, docs/sources/original-platform-specs/restaurant-platform-specs/07-module-crm.md: 7. Privacy and marketing safety, docs/sources/original-platform-specs/restaurant-platform-specs/07-module-crm.md: 8. Reporting UX (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (11): docs/sources/original-platform-specs/restaurant-platform-specs/08-module-whatsapp.md: Module Specification — WhatsApp Conversations, Ordering & Campaigns, docs/sources/original-platform-specs/restaurant-platform-specs/08-module-whatsapp.md: 3. MVP scope (deterministic before AI), docs/sources/original-platform-specs/restaurant-platform-specs/08-module-whatsapp.md: 4. Data model, docs/sources/original-platform-specs/restaurant-platform-specs/08-module-whatsapp.md: 1. Product contract, docs/sources/original-platform-specs/restaurant-platform-specs/08-module-whatsapp.md: 5. Order conversation state machine, docs/sources/original-platform-specs/restaurant-platform-specs/08-module-whatsapp.md: 6. Payment link flow, docs/sources/original-platform-specs/restaurant-platform-specs/08-module-whatsapp.md: 7. Outbound campaign workflow, docs/sources/original-platform-specs/restaurant-platform-specs/08-module-whatsapp.md: 8. AI behavior and guardrails (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (11): docs/sources/original-platform-specs/restaurant-platform-specs/17-testing-and-acceptance.md: Testing Strategy & Definition of Done, docs/sources/original-platform-specs/restaurant-platform-specs/17-testing-and-acceptance.md: 2. MVP critical scenarios, docs/sources/original-platform-specs/restaurant-platform-specs/17-testing-and-acceptance.md: Platform/entitlements, docs/sources/original-platform-specs/restaurant-platform-specs/17-testing-and-acceptance.md: Orders/payments, docs/sources/original-platform-specs/restaurant-platform-specs/17-testing-and-acceptance.md: POS, docs/sources/original-platform-specs/restaurant-platform-specs/17-testing-and-acceptance.md: 1. Test layers, docs/sources/original-platform-specs/restaurant-platform-specs/17-testing-and-acceptance.md: Loyalty, docs/sources/original-platform-specs/restaurant-platform-specs/17-testing-and-acceptance.md: WhatsApp/CRM/privacy (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (11): compilerOptions, allowImportingTsExtensions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noEmit, skipLibCheck (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (10): label, placeholder, body, attributes, id, type, validations, description (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (10): docs/sources/original-platform-specs/restaurant-platform-specs/04-module-qr-menu.md: Module Specification — QR Digital Menu, docs/sources/original-platform-specs/restaurant-platform-specs/04-module-qr-menu.md: Optional integrations, docs/sources/original-platform-specs/restaurant-platform-specs/04-module-qr-menu.md: 2. MVP scope, docs/sources/original-platform-specs/restaurant-platform-specs/04-module-qr-menu.md: 3. Domain model, docs/sources/original-platform-specs/restaurant-platform-specs/04-module-qr-menu.md: 1. Product contract, docs/sources/original-platform-specs/restaurant-platform-specs/04-module-qr-menu.md: 4. Public routes, docs/sources/original-platform-specs/restaurant-platform-specs/04-module-qr-menu.md: 5. UX, docs/sources/original-platform-specs/restaurant-platform-specs/04-module-qr-menu.md: 6. Data and integration behavior (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (10): docs/sources/original-platform-specs/restaurant-platform-specs/09-module-catering.md: Module Specification — Catering & Private Event Estimator, docs/sources/original-platform-specs/restaurant-platform-specs/09-module-catering.md: 3. Pricing engine, docs/sources/original-platform-specs/restaurant-platform-specs/09-module-catering.md: 1. Product contract, docs/sources/original-platform-specs/restaurant-platform-specs/09-module-catering.md: 4. Data model, docs/sources/original-platform-specs/restaurant-platform-specs/09-module-catering.md: 5. Statuses, docs/sources/original-platform-specs/restaurant-platform-specs/09-module-catering.md: 6. PDF/communications, docs/sources/original-platform-specs/restaurant-platform-specs/09-module-catering.md: 7. Admin screens, docs/sources/original-platform-specs/restaurant-platform-specs/09-module-catering.md: 8. Capacity and feasibility (+2 more)

### Community 23 - "Community 23"
Cohesion: 0.18
Nodes (10): docs/sources/original-platform-specs/restaurant-platform-specs/13-deployment-and-operations.md: Deployment, Environments & Operations, docs/sources/original-platform-specs/restaurant-platform-specs/13-deployment-and-operations.md: 2. Environments, docs/sources/original-platform-specs/restaurant-platform-specs/13-deployment-and-operations.md: 3. Runtime services, docs/sources/original-platform-specs/restaurant-platform-specs/13-deployment-and-operations.md: 4. Infrastructure-as-code and deploy, docs/sources/original-platform-specs/restaurant-platform-specs/13-deployment-and-operations.md: 1. Initial provider/region recommendation, docs/sources/original-platform-specs/restaurant-platform-specs/13-deployment-and-operations.md: 5. Data protection / backup, docs/sources/original-platform-specs/restaurant-platform-specs/13-deployment-and-operations.md: 6. Observability, docs/sources/original-platform-specs/restaurant-platform-specs/13-deployment-and-operations.md: 7. Cost controls (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (10): docs/sources/original-platform-specs/restaurant-platform-specs/15-prebuild-customer-validation.md: Pre-Build Customer Validation & First Restaurant Pilot, docs/sources/original-platform-specs/restaurant-platform-specs/15-prebuild-customer-validation.md: 3. Interview guide, docs/sources/original-platform-specs/restaurant-platform-specs/15-prebuild-customer-validation.md: 4. Prototype screens to make before code, docs/sources/original-platform-specs/restaurant-platform-specs/15-prebuild-customer-validation.md: 1. Objective, docs/sources/original-platform-specs/restaurant-platform-specs/15-prebuild-customer-validation.md: 5. Prototype feedback test, docs/sources/original-platform-specs/restaurant-platform-specs/15-prebuild-customer-validation.md: 6. Pilot agreement checklist, docs/sources/original-platform-specs/restaurant-platform-specs/15-prebuild-customer-validation.md: 7. Concierge pilot options, docs/sources/original-platform-specs/restaurant-platform-specs/15-prebuild-customer-validation.md: 2. Recruitment plan (+2 more)

### Community 25 - "Community 25"
Cohesion: 0.20
Nodes (9): docs/sources/original-platform-specs/restaurant-platform-specs/03-design-system-and-frontend.md: Shared Design System & Frontend Standards, docs/sources/original-platform-specs/restaurant-platform-specs/03-design-system-and-frontend.md: 3. Tokens, docs/sources/original-platform-specs/restaurant-platform-specs/03-design-system-and-frontend.md: 4. Layout patterns, docs/sources/original-platform-specs/restaurant-platform-specs/03-design-system-and-frontend.md: 1. Product feel, docs/sources/original-platform-specs/restaurant-platform-specs/03-design-system-and-frontend.md: 5. Localization for Chile, docs/sources/original-platform-specs/restaurant-platform-specs/03-design-system-and-frontend.md: 6. Public menu performance, docs/sources/original-platform-specs/restaurant-platform-specs/03-design-system-and-frontend.md: 7. Frontend security, docs/sources/original-platform-specs/restaurant-platform-specs/03-design-system-and-frontend.md: 8. Frontend acceptance checklist (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (9): docs/sources/original-platform-specs/restaurant-platform-specs/12-security-privacy-chile.md: Security, Privacy & Chile Compliance Checklist, docs/sources/original-platform-specs/restaurant-platform-specs/12-security-privacy-chile.md: 3. Consent and suppression, docs/sources/original-platform-specs/restaurant-platform-specs/12-security-privacy-chile.md: 4. Data minimization, docs/sources/original-platform-specs/restaurant-platform-specs/12-security-privacy-chile.md: 5. Customer rights and lifecycle, docs/sources/original-platform-specs/restaurant-platform-specs/12-security-privacy-chile.md: 6. Security controls, docs/sources/original-platform-specs/restaurant-platform-specs/12-security-privacy-chile.md: 1. Chile-specific timing, docs/sources/original-platform-specs/restaurant-platform-specs/12-security-privacy-chile.md: 7. Chile operational/commercial checks, docs/sources/original-platform-specs/restaurant-platform-specs/12-security-privacy-chile.md: 8. Security acceptance checklist (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (9): docs/sources/original-platform-specs/restaurant-platform-specs/14-billing-entitlements.md: Modular Catalog, Subscription Billing & Entitlements, docs/sources/original-platform-specs/restaurant-platform-specs/14-billing-entitlements.md: 3. Tables, docs/sources/original-platform-specs/restaurant-platform-specs/14-billing-entitlements.md: 4. Dependency/activation flow, docs/sources/original-platform-specs/restaurant-platform-specs/14-billing-entitlements.md: 1. Goals, docs/sources/original-platform-specs/restaurant-platform-specs/14-billing-entitlements.md: 5. Dependency graph, docs/sources/original-platform-specs/restaurant-platform-specs/14-billing-entitlements.md: 6. Pricing model recommendation, docs/sources/original-platform-specs/restaurant-platform-specs/14-billing-entitlements.md: 7. Chile billing provider, docs/sources/original-platform-specs/restaurant-platform-specs/14-billing-entitlements.md: 8. Acceptance criteria (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.22
Nodes (7): docs/catalog-and-availability.md: Shared catalog, availability and manual import (#7), docs/catalog-and-availability.md: Canonical file import, docs/catalog-and-availability.md: Implemented scope and provider gate, docs/catalog-and-availability.md: Customer selection and safe confirmation, docs/catalog-and-availability.md: Availability rules, docs/catalog-and-availability.md: HTTP surface, docs/catalog-and-availability.md: Staff controls

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (8): docs/architecture.md: Architecture and deployment, docs/architecture.md: Runtime boundaries, docs/architecture.md: Durable model to implement in M1/M2, docs/architecture.md: Payment and fulfillment contracts, docs/architecture.md: Regional deployment target, docs/architecture.md: Observability and required verification, docs/architecture.md: PostgreSQL and access implementation (#6), docs/architecture.md: Catalog and availability extension (#7)

### Community 30 - "Community 30"
Cohesion: 0.22
Nodes (8): docs/product-and-milestones.md: Product direction and POC milestones, docs/product-and-milestones.md: Commercial modularity, docs/product-and-milestones.md: What is complete in this change, docs/product-and-milestones.md: Delivery gates, docs/product-and-milestones.md: Scope update: prospect demo before restaurant onboarding, docs/product-and-milestones.md: Suggested two-person division, docs/product-and-milestones.md: First pilot release essentials, docs/product-and-milestones.md: First outcome

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (8): docs/sources/original-platform-specs/restaurant-platform-specs/16-shared-domain-and-event-contracts.md: Shared Domain Model, API & Event Contracts, docs/sources/original-platform-specs/restaurant-platform-specs/16-shared-domain-and-event-contracts.md: 2. Canonical core entities, docs/sources/original-platform-specs/restaurant-platform-specs/16-shared-domain-and-event-contracts.md: 3. Event envelope, docs/sources/original-platform-specs/restaurant-platform-specs/16-shared-domain-and-event-contracts.md: 1. Global identifiers and money/time rules, docs/sources/original-platform-specs/restaurant-platform-specs/16-shared-domain-and-event-contracts.md: 4. Initial event taxonomy, docs/sources/original-platform-specs/restaurant-platform-specs/16-shared-domain-and-event-contracts.md: 5. Transactional outbox/inbox, docs/sources/original-platform-specs/restaurant-platform-specs/16-shared-domain-and-event-contracts.md: 6. API conventions, docs/sources/original-platform-specs/restaurant-platform-specs/16-shared-domain-and-event-contracts.md: 7. Critical invariants

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (7): docs/integrations.md: Integration decisions and test setup, docs/integrations.md: Toteat, docs/integrations.md: Fudo, docs/integrations.md: Hosted checkout gate, docs/integrations.md: WhatsApp test-account setup, docs/integrations.md: Provider parity gate, docs/integrations.md: Capability matrix

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (6): docs/sources/original-platform-specs/README(1).md: Chile Restaurant Platform — Product & Engineering Specification Pack, docs/sources/original-platform-specs/README(1).md: Start here, docs/sources/original-platform-specs/README(1).md: Document index, docs/sources/original-platform-specs/README(1).md: Non-negotiable product principles, docs/sources/original-platform-specs/README(1).md: Research caveat, docs/sources/original-platform-specs/README(1).md: Primary references (verified 2026-10-15)

### Community 34 - "Community 34"
Cohesion: 0.29
Nodes (6): docs/sources/original-platform-specs/restaurant-platform-specs/README.md: Chile Restaurant Platform — Product & Engineering Specification Pack, docs/sources/original-platform-specs/restaurant-platform-specs/README.md: Start here, docs/sources/original-platform-specs/restaurant-platform-specs/README.md: Document index, docs/sources/original-platform-specs/restaurant-platform-specs/README.md: Non-negotiable product principles, docs/sources/original-platform-specs/restaurant-platform-specs/README.md: Research caveat, docs/sources/original-platform-specs/restaurant-platform-specs/README.md: Primary references (verified 2026-10-15)

### Community 35 - "Community 35"
Cohesion: 0.33
Nodes (5): docs/demo-and-pilot.md: Customer demo and pilot acceptance, docs/demo-and-pilot.md: Sandbox acceptance before live pilot, docs/demo-and-pilot.md: Five-minute discovery demo (available now), docs/demo-and-pilot.md: Pilot go/no-go, docs/demo-and-pilot.md: Validation record for this foundation

## Knowledge Gaps
- **291 isolated node(s):** `AGENTS.md: Easy Eatery repository guide`, `README.md: Easy Eatery`, `README.md: Run the demo`, `README.md: Durable WhatsApp message processing`, `README.md: Read next` (+286 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 345 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `migrations/AGENTS.md: Database schema history` connect `Community 0` to `Community 3`, `Community 28`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `AGENTS.md: Easy Eatery repository guide`, `README.md: Easy Eatery`, `README.md: Run the demo` to the rest of the system?**
  _291 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09471153846153846 - nodes in this community are weakly interconnected._
- **Why does `docs/cloud-agent-handoff.md: Verified implementation baseline` connect `Community 2` to `Community 8`, `Community 0`, `Community 6`, `Community 1`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10100475938656796 - nodes in this community are weakly interconnected._
- **Why does `tests/AGENTS.md: Verification map` connect `Community 5` to `Community 0`, `Community 6`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10897435897435898 - nodes in this community are weakly interconnected._
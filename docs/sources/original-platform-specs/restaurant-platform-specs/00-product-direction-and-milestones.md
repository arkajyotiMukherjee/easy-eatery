# Product Direction & Implementation Milestones

## 1. Product thesis

Build a modular restaurant technology platform for Chilean independent restaurants and small multi-branch operators. The platform sells independently useful modules that share data when the restaurant enables multiple services. Each additional module can close more of the customer loop, but no module should require a different paid module unless that dependency is explicitly disclosed and accepted.

Initial modules:

1. QR digital menu (optional)
2. Pickup ordering and kitchen/order dashboard
3. Loyalty program with Google Wallet and POS support
4. CRM and customer/event aggregation
5. WhatsApp conversational ordering, campaigns and payment links
6. Catering/private-event estimation and quotations

Important shared capabilities: tenant/branch administration, menu and product catalog, order management, identity/consent, integration connections, payment abstraction, notifications, audit log, module entitlements and an event outbox.

## 2. Two-person-team delivery rule

**Do not build the whole platform before the first customer.** Start with design prototypes and a concierge pilot. Use the partner's industry access to recruit 3–5 qualified restaurants, interview them, show realistic clickable flows, and obtain a written pilot commitment from one customer. The first release may use manual steps behind a polished interface where safe and transparent; automate only when repeated pain has been observed.

Two founders should divide ownership by capability rather than by customer-facing module:

- **Product/domain owner:** restaurant interviews, Chilean operations, workflow design, data and integration access, onboarding, pricing and support.
- **Engineering/design-system owner:** prototype system, shared platform skeleton, deployment, quality, security and reusable implementation patterns.
- Both founders participate in design reviews, pilot onboarding and weekly priority decisions.

## 3. How to choose the first workflow

Score candidate workflows from 1–5 on: (a) pain intensity, (b) frequency, (c) customer willingness to pay, (d) time to first measurable value, (e) ability to demo without deep integration, (f) integration risk, and (g) ability to create a repeatable loop. Weight pain, willingness to pay and time-to-value twice as strongly as novelty. Pick the one workflow with the best evidence, not the most ambitious bundle.

Candidate starting wedges to test:

- Pickup storefront + order-status screen, with menu sync/manual fallback.
- WhatsApp inquiry capture + catering quote PDF, for restaurants with high event sales.
- POS sales import + simple customer visit report, if the restaurant already has a POS and wants customer data.
- Loyalty enrolment and manual staff-assisted point earning, if retention is an acute concern.

Do not decide from founder preference alone. The design partner's current process, current spend and willingness to pilot determine the first wedge.

## 4. Milestones ordered by value and risk, not by original module numbering

| Milestone | Value | Relative complexity | Required outcome / exit gate |
|---|---:|---:|---|
| M0 — Problem validation | Very high | Low | 3–5 interviews; one written problem statement with current workaround, cost of problem and buying trigger |
| M1 — Clickable prototype | Very high | Low–medium | Testable prototype of onboarding + chosen workflow + owner dashboard; at least 3 users understand it without explanation |
| M2 — Pilot commitment | Very high | Low | One named restaurant agrees on scope, success metric, owner/contact, data access and pilot date; no production build before this |
| M3 — Concierge/manual pilot | High | Low–medium | Deliver the workflow using prototype/no-code/manual back office where possible; measure outcome and failures over actual restaurant operations |
| M4 — Minimal shared platform | High | Medium | Tenant/branch, user roles, audit, module entitlements, menu or lead data required by the chosen wedge, backup and production deploy |
| M5 — First paid workflow | Very high | Medium | One module works end-to-end for one restaurant, including support runbook and basic billing outside product if needed |
| M6 — Close one data loop | Very high | Medium | A real event (order/sale/quote) updates customer or lead record and yields one useful outcome/report; no requirement to automate every integration yet |
| M7 — First provider integration | High | Medium–high | One chosen POS/payment provider is validated in a real account and its retries, reconciliation and credential rotation are tested |
| M8 — First additional module | High | Medium | A second separately purchasable module can be enabled without breaking existing workflows; proves modularity |
| M9 — Self-service onboarding and subscriptions | Medium–high | Medium–high | Admin can pick modules, complete setup and understand pricing; automate only after the initial manual process is stable |
| M10 — CRM segments and campaign automation | Medium–high | High | RFM, consent rules, campaign audience preview, suppression and delivery reporting are reliable |
| M11 — Native Google Wallet lifecycle + POS redemption | Medium–high | High | Issuer approval, pass lifecycle, POS scan/redeem and reversals tested across failure cases |
| M12 — AI WhatsApp ordering and advanced attribution | Medium | High | Only after deterministic ordering/campaign ROI is demonstrated; AI never controls payment or pricing correctness |
| M13 — Multi-POS coverage, multi-country and advanced analytics | Lower near-term | Very high | Enter only after repeatable local onboarding, support and positive gross margin |

### Rule for moving work between milestones

A feature is P0 only when at least one is true: (1) without it, the first contracted workflow cannot run; (2) the buyer explicitly says it is a purchase blocker; (3) it protects money, privacy or order correctness; or (4) it is required by a provider/contract/legal obligation. Otherwise it is P1/P2 and must compete on evidence.

## 5. Minimum sellable V1 — define it after M1/M2

There is no universal V1 that includes all six modules. V1 is the smallest complete restaurant outcome. Its common foundation should include:

- Spanish (Chile) UI, CLP, `America/Santiago`, one restaurant + branch, secure login/roles.
- Branded owner dashboard with module status, onboarding checklist, support/contact route and recent activity.
- One actual independently valuable workflow.
- Clear error states and manual recovery; order/payment/quote states are visible.
- Basic audit log, consent recording where customer data is collected, export/delete process, backups and error reporting.
- Production deploy, environment separation, restore test and support runbook.

Only add a paid module after its minimum flow can complete without depending on an unpurchased module.

## 6. Metrics

### Discovery / sales
- Interview-to-prototype acceptance rate.
- Prototype-to-pilot commitment rate.
- Time from first meeting to first usable outcome.
- Stated monthly willingness to pay and current workaround costs.

### Product
- Time to complete core task (menu/order/quote depending on wedge).
- Successful workflow completion rate.
- Number of staff interventions per order/quote.
- Integration events matched and reconciled; duplicate/missed event count.
- Repeat purchase or qualified catering lead conversion, only where measurable.

### Business
- Paid restaurants and active branches.
- Activation rate per module.
- Gross margin per tenant/module, including third-party fees and support time.
- Onboarding hours per tenant; support minutes per week.
- Module expansion/retention and cancellation reasons.

## 7. Out of scope before proven demand

- Microservices, Kubernetes, Kafka, data warehouse, graph database, separate auth service.
- An LLM-based general assistant across all features.
- Every Chilean POS provider and every payment provider.
- Fully automated billing/tax documentation before local accountant/legal review.
- Native mobile apps; responsive web/PWA first.
- Fully autonomous customer identity merging.
- Loyalty points earned from uncertain/unreconciled POS events.

## 8. Risk register

| Risk | Mitigation / gate |
|---|---|
| Restaurant does not pay for the integrated bundle | Sell a narrow workflow; obtain pilot commitment before implementation |
| POS API unavailable/approval-gated | Get provider account, API docs, permissions and test data before promising connector support |
| Modular product becomes a bespoke integration agency | Standardize provider adapters, onboarding checklist and supported capability matrix |
| Feature interdependence defeats modular billing | Capability graph and module-isolation acceptance tests |
| Customer data without consent | Purpose-bound consent records, minimal collection and Chilean legal review before campaigns |
| Third-party API outage loses events | Transactional outbox, retries, replay and reconciliation |
| Support burden overwhelms two founders | Manual concierge is acceptable in pilot; log recurring intervention, automate only recurring steps |

## 9. Decision log format

Keep `docs/decisions/NNN-short-title.md` with: context, decision, alternatives, reasoning, consequences, date, owner and revisit trigger. Any unresolved provider access must be marked `BLOCKED_PENDING_PROVIDER_VALIDATION`, not presented as shipped capability.

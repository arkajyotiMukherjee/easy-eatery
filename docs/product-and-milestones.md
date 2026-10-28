# Product direction and POC milestones

## First outcome

A customer sends a WhatsApp greeting, sees the restaurant menu, chooses items, confirms a final CLP price, receives an approved hosted checkout link, pays, and collects a restaurant-accepted order. The same order reaches the restaurant's POS/kitchen once. Staff can identify Easy Eatery pickup orders, readiness and exceptions in a dashboard.

Start with one branch per restaurant, Spanish by default (`es-CL`) plus English for testing/staff, CLP integer amounts and `America/Santiago` business dates. Support **both Toteat and Fudo in the initial pilot**, configured per restaurant/branch and verified through separate sandbox journeys. Treat the POS and gateway as the restaurant's systems of record for acceptance and payment. A paid order is not automatically a kitchen-accepted order.

## Commercial modularity

| Shared capability, included infrastructure | Independently enabled service | Connector |
| --- | --- | --- |
| Tenants, staff, catalog, product/modifier IDs | WhatsApp ordering (first POC) | Meta WhatsApp Cloud API |
| Order/checkout orchestration, prices, audit | Public QR menu (later) | Toteat and approved Fudo external ordering |
| Payment ledger, integration routing, operational reporting | Web pickup storefront (later) | Approved hosted payment provider |
| Events and minimal customer identity | Loyalty, CRM, inventory, catering and campaigns (later) | Further provider adapters |

WhatsApp accesses the catalog directly through shared services. Disabling QR menu must not remove products or stop ordering. Full CRM, loyalty, inventory and marketing are outside this POC. Both requested POS adapters are in scope; a billing engine, marketplace, AI agent and microservice fleet are deferred.

## What is complete in this change

The runnable simulation covers menu → cart → confirmed total → simulated payment → simulated kitchen → ready → collected. It demonstrates independence from QR menu, counts pickups and has critical-path tests. A Cloud API test transport and signed webhook route are scaffolded and tested with fixtures. No live Meta account, POS account, checkout, actual kitchen handoff, database or cloud environment has been connected or verified.

## Delivery gates

| Milestone | Value and exit gate | Complexity | Issues |
| --- | --- | --- | --- |
| [M0: pilot and access](https://github.com/arkajyotiMukherjee/easy-eatery/milestone/1) | Restaurant validates the flow; POS access and checkout feasibility proven; owner approves actual providers | Low implementation, high external dependency | #1–#4 |
| [M1: foundation and demo](https://github.com/arkajyotiMukherjee/easy-eatery/milestone/2) | Repeatable local demo plus durable catalog/orders, tenant authorization and immutable quote contracts | Medium | #5–#8 |
| [M2: real WhatsApp](https://github.com/arkajyotiMukherjee/easy-eatery/milestone/3) | Permitted recipient completes Spanish flow; signed ingress and durable delivery survive retries/restart | Medium | #9–#12 |
| [M3: payment and kitchen](https://github.com/arkajyotiMukherjee/easy-eatery/milestone/4) | Verified sandbox payment produces one kitchen-accepted order for each provider; failure recovery and adapter parity verified | Highest, built after access gates | #13–#17, #22–#23 |
| [M4: customer demo and pilot](https://github.com/arkajyotiMukherjee/easy-eatery/milestone/5) | Regional staging, authenticated operations, runbooks, restaurant acceptance and pilot go/no-go | Medium, final integration | #18–#21 |

Milestones are outcome groups, not a requirement to finish every task in one group before starting another. Start Meta account access early (#9) while catalog work proceeds. Staging (#19) can proceed after durable ingress. Kitchen/payment engineering depends on explicit feasibility results (#2, #3). Provider approval waiting time is not engineering effort and can dominate the schedule.

## Suggested two-person division

The Chile-based partner owns restaurant interviews, Spanish flow feedback, merchant/POS access, menu verification and kitchen rehearsals. The engineering owner builds shared services, transport, adapters, reconciliation and staging. Pair on payment/KDS acceptance and the customer demo. The estimates in issues are planning ranges, not delivery promises; re-estimate after M0 and avoid assigning dates before access is proven.

Critical path: **#1 → #2 → #3; #5 → #6 → #7 → #8 → #10 → #11; #13 + #22 + #14 → #15 → #16 → #23; #17 → #18 → #21**. #9, #19 and #20 have their own dependencies in GitHub. Both POS systems must pass #23 before pilot sign-off.

## First pilot release essentials

Menu correctness, availability/hours, deterministic pricing, cart edits, explicit confirmation, secure payment verification, kitchen acknowledgment, duplicate protection, staff exceptions, readiness/pickup status and reconciliation are required. Staff auth, durability and operational ownership are required even for a small live pilot. Prototype feedback precedes the broad platform build.

Proposed pilot targets to agree in #1: zero duplicate kitchen fulfillment; every paid order reconciles to a POS order or assigned exception; no unexplained price mismatch; complete at least ten agreed scripted sandbox journeys before live traffic. Measure message-to-order conversion, checkout completion, payment-to-acceptance latency, pickup completion, exceptions and restaurant staff time. Set latency and conversion thresholds with the restaurant after observing its baseline.

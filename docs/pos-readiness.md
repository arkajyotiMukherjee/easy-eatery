# Toteat and Fudo readiness

This checklist supports [#13](https://github.com/arkajyotiMukherjee/easy-eatery/issues/13), [#22](https://github.com/arkajyotiMukherjee/easy-eatery/issues/22) and [#23](https://github.com/arkajyotiMukherjee/easy-eatery/issues/23). Both connectors remain restaurant-pilot requirements. The prospect demo can use the application's local kitchen independently of either connector. A branch selects one provider; an order keeps that selection after later branch changes.

The sources below were recorded in the repository's 28 October 2026 research. A fresh read from this cloud machine on the same date returned proxy `403 Forbidden` for the Toteat and Fudo documentation hosts. The account-specific contracts and provider behavior have therefore **not been revalidated here**. No vendor account, credential, order or kitchen acceptance was obtained. Recheck the authoritative documents and the authorized restaurant account before implementing external requests.

## Capability and evidence matrix

| Question | Toteat | Fudo | Evidence needed before acceptance |
| --- | --- | --- | --- |
| Who grants access? | Recorded configuration guide describes owner-enabled API access and account-specific restaurant/local/user identifiers. | Recorded external-order guide requires approval and a Delivery-enabled account; general API access is separate. | Owner authorization, permitted test account/branch, current integration contract and supported environment. |
| Catalog and modifiers | Public specification lists product access; actual IDs and modifier mappings remain account-specific. | General API documents business/product data; whether it supplies this integration's catalog needs confirmation. | Sanitized catalog fixture, approved bilingual menu/prices, modifier and tax/payment mappings for this branch. |
| Create a pickup order | Recorded order contract describes an external-order endpoint and open-shift precondition. | Requires the approved external-order contract; no request schema is inferred from generic sales APIs. | Authorized request/response fixtures, supported pickup semantics, required fields and accepted reference. |
| Which kitchen receives it? | Printer/KDS routing and the account's shift configuration are unverified. | Recorded guide says external orders use Delivery rather than Mesas y Mostrador; actual restaurant routing is unverified. | Staff observes one test order in the intended branch/workflow and confirms preparation/readiness. |
| Can an uncertain request be retried? | Idempotency/correlation lookup guarantees remain unverified. | Idempotency/correlation lookup guarantees remain unverified. | Official duplicate semantics, correlation/status query, timeout procedure and a repeatable uncertain-outcome rehearsal. |
| Status callbacks and recovery | Public index lists status/events; authentication, ordering and account behavior need verification. | Authorized event/status contract is required. | Sanitized signed/authenticated fixtures, replay/out-of-order behavior, readiness mapping and recovery ownership. |
| Does the POS create hosted checkout? | Not established by recorded order payment fields. | Not established by recorded help documentation. | Explicit supported checkout contract or owner-approved independent gateway, authoritative reconciliation and merchant settlement recipient. |
| Is local adapter evidence sufficient? | No: current `DemoPosProvider` creates synthetic references. | No: the same demo class uses a different label. | Separate provider contract tests and real authorized kitchen evidence for each connector. |

The current shared `PosProvider` port exposes only `submitPaidPickup(order) -> {reference}`. It does not define vendor authentication, HTTP payloads, acceptance callbacks, refund behavior or uncertain-outcome classification. Do not invent those details to fill a mock. The demo adapter's process-local Map and deterministic reference demonstrate local replay behavior; neither establishes distributed vendor idempotency or durable kitchen acceptance.

## Access package for the owner and restaurant partner

Prepare this information without sending a vendor request or creating an account:

1. Name the consenting restaurant, operational owner, selected provider, isolated test branch and permitted test window. Confirm who may inspect the kitchen and authorize synthetic orders. Do not use customer data for this exercise.
2. Obtain current authorized technical documentation, a definite test base URL, supported API version, allowed routes, rate limits and credential scope. Store credentials through approved secret configuration, outside Git, logs, fixtures and issue comments.
3. For Toteat, confirm API enablement, restaurant/local/user identifiers, external-order/origin configuration and shift rules against its configuration guide. Confirm the usable base URL: the recorded specification contains differing descriptive and `servers` URLs.
4. For Fudo, confirm external-order approval and Delivery availability. Obtain that integration's Client ID/Client Secret and approved contract. General/Pro API keys do not establish external-order permission; confirm any separate catalog requirement before purchasing or granting extra access.
5. Request sanitized examples of success, validation/authentication rejection, rate limiting, server failure, closed shift and timeout/status lookup. Ask which identifiers are stable correlation keys and which operations can charge or resend an order.
6. Confirm payment-method mapping, tax/tip/service assumptions and the settlement recipient. An order marked paid inside a POS is not evidence that a gateway settled money. Use authorized sandbox evidence before a real-money pilot.

These are preparation questions, not instructions to contact vendors, accept terms, purchase a plan or provision a merchant account. Those actions retain the documented owner and provider gates.

## Shared acceptance rehearsal, once access exists

Run these cases separately for each authorized connector, retaining the exact contract/version and a redacted evidence record:

| Case | Required observation |
| --- | --- |
| Correct immutable order | Server-authoritative integer CLP total, approved products/modifiers, original confirmed price and selected branch/provider reach the intended test kitchen. |
| Provider switch | Changing branch defaults after confirmation never redirects the existing order. No fallback sends it to another provider or restaurant. |
| Replay and concurrent workers | The authorized duplicate/correlation mechanism proves one kitchen ticket for one payment/order intent across retries and process restart. A local Map is insufficient. |
| Rejection and unavailable service | Unknown mapping, closed shift, explicit rejection and rate limiting leave truthful payment/kitchen states and bounded recovery. No failure is labeled accepted. |
| Ambiguous outcome | Timeout or connection loss after submission pauses uncertain work, queries the documented correlation/status operation and never blindly resubmits. |
| Status and scope | Authenticated events/status queries cannot cross tenant/branch/provider scope; replay and late/out-of-order events cannot regress authoritative state. |
| Payment and pickup | Only the approved payment evidence permits paid submission; acceptance, readiness and collection remain distinct from financial settlement. Refund/cancellation exceptions have an identified operator and approved procedure. |

Record provider, test environment, contract version, application commit, synthetic case, expected/observed result, redacted reference, staff witness role and unresolved limitation. Keep account identifiers, credentials and customer contacts in the authorized private evidence system. An issue comment should link a safe evidence summary, never raw requests with credential-bearing URLs.

## Current local checks and remaining gates

`npm test` checks simulated provider selection and confirmed routing snapshots. `tests/pos-boundary.test.ts` additionally checks that the shared service gives a connector a detached order and does not report kitchen acceptance after a connector exception. These use synthetic ports and have no vendor HTTP schema. `node --import tsx scripts/rehearse-demo.ts` exercises both simulated provider labels over local HTTP. None proves Toteat/Fudo access, contract compatibility, kitchen acceptance, settlement or refund support.

Keep #13/#22/#23 open until their provider-specific criteria and restaurant evidence pass. The missing approved accounts/contracts, real kitchen witnesses and payment/settlement decisions are external gates; shared local tests cannot close them.

## Authoritative source index

- [Toteat API index](https://developers.toteat.com/toteatApi_v2.yaml): recorded catalog, shift, order/status and event surface.
- [Toteat configuration guide](https://developers.toteat.com/tags/config_tag.yaml): recorded owner/API and account configuration requirements.
- [Toteat order contract](https://developers.toteat.com/paths/create_order.yaml): recorded external-order fields, query credentials and shift precondition. Never log credential-bearing URLs.
- [Fudo external-order integration guide](https://soporte.fu.do/es/articles/15707531-integracion-de-pedidos-externos-via-apis): recorded approval and Delivery workflow requirements.
- [Fudo general-purpose API guide](https://soporte.fu.do/es/articles/11939789-api-publica-de-proposito-general): recorded separate data-API access; does not authorize external-order injection.
- [Repository integration decisions](integrations.md) and [owner onboarding](live-demo-onboarding.md): prior research and the broader Meta/payment/hosting gates.

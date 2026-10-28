# Customer demo and pilot acceptance

## Five-minute discovery demo (available now)

Run the application using the README. Use synthetic customer data. Spanish is the default; choose **English** in the header to test the entire dashboard and chat in English. Only the display preference is stored in browser local storage; the panel token stays in page memory. A language change preserves the server cart/order and only affects subsequent chat replies; existing messages keep their original language.

| Step | Spanish | English | Visible evidence |
| --- | --- | --- | --- |
| Open | Abrir demo | Open demo | Key from terminal or `.env`; authenticated dashboard |
| Greet | `hola` | `hello` | Localized menu with three seeded products |
| Choose | `1 x 2`, then `3` | Same item numbers | Two completos plus lemonade; total CLP 11,500 |
| Edit | `quitar 3`, then `3` | `remove 3`, then `3` | Correctly recalculated total |
| Confirm | `confirmar` | `confirm` | Frozen order snapshot; simulated payment reference |
| Pay | Simular pago y enviar a cocina | Simulate payment and send to kitchen | Paid and preparing; simulated provider reference |
| Ready | Marcar listo para retirar | Mark ready for pickup | Ready status |
| Collect | Confirmar retiro | Confirm pickup | Collected count increases; revenue remains CLP 11,500 |
| Repeat | `nuevo` | `new` | Empty cart for another order after payment |

Re-send confirmation before payment: the same order is recovered, with no second kitchen submission. Attempt to mark an unpaid order ready: the API rejects it. Show the QR-module-disabled note to explain shared catalog independence. Set `POS_PROVIDER=fudo` and restart to demonstrate the same local mock flow labeled Fudo; default is Toteat. **Neither mode calls a real POS**. Restarting clears records in memory mode; PostgreSQL mode preserves them and uses scoped staff tokens.

Ask the restaurant to validate its actual menu, modifiers, pickup promise, busy/closed handling and staff responsibility. Record objections and changes in #4 rather than building the full platform. A visually complete simulation is enough for initial feedback, while a pilot requires the real-provider gates below.

## Sandbox acceptance before live pilot

Use authorized Meta test recipients, gateway sandbox transactions and separate Toteat/Fudo restaurant test accounts. Run the complete journey for **each provider**, in Spanish and English, and capture redacted provider references and restaurant confirmation that the expected kitchen station received it.

| Case | Required result |
| --- | --- |
| Happy path | Authoritative final amount; verified sandbox payment; exactly one kitchen-accepted pickup; collected metrics reconcile |
| Initial greeting / unsupported input | Menu/help instead of an invented order |
| Cart or language change | Existing order/cart preserved, correct localized names and integer CLP total |
| Sold-out or price change | Reject/reconfirm before payment; never silently substitute items or charge a changed amount |
| Closed kitchen / shift | Block checkout or route a paid exception to staff; no unsupported preparation promise |
| Duplicate messages / confirm / payment / POS callbacks | No duplicate fulfillment or revenue |
| Browser return / forged payment / wrong amount or merchant | No paid authorization and no kitchen submission |
| POS submit timeout | Reconcile by provider reference; unknown outcome goes to staff if safe retry cannot be proven |
| Paid but rejected / late payment | Assigned exception, customer communication and auditable refund/recovery |
| Missing callback / process restart | Durable inbox/outbox recovers; dashboard shows stale state and exception |
| Ready notification | Messaging-window/template rules enforced; failure visible to staff |
| Tenant/provider isolation | No other account's orders, contacts, credentials or callbacks accessible |

## Pilot go/no-go

Required: both provider approvals/configurations, authoritative catalog, secure hosted checkout, durable state/replay protection, authenticated staff dashboard, payment/POS reconciliation, refunds, preparation/pickup ownership and a tested support fallback. No demo endpoint may authorize real payments. Do not label the pilot ready while Fudo approval or either kitchen integration is unverified.

The restaurant partner owns menu sign-off, kitchen/printer/KDS validation, service hours and customer support. The engineer owns deployment, incident diagnosis and integration correctness. Agree who contacts a customer when payment succeeds but kitchen acceptance fails and who can issue a refund. Review data collection, retention/deletion, restaurant access and local privacy requirements with appropriate local support; avoid marketing capture in this ordering POC.

Before service: verify open shift, correct menu, working sender/templates, POS connection, payment status and assigned staff. During service: watch unaccepted paid orders, dead letters and stale readiness. After service: reconcile payments/refunds, POS orders and collected records; investigate every unexplained mismatch. Rehearse provider outage and manual recovery before accepting live orders.

Record owner feedback and agreed baseline measures: completion rate, missed/duplicate orders, payment-to-acceptance time, pickup wait, reconciliation exceptions and staff effort. Expand to another branch or module after the observed pilot supports the next step.

## Validation record for this foundation

Automated coverage checks the simulation loop, amount/state boundaries, duplicate inbound handling, separate customer carts, schema/auth, signature validation and delivery retry. The separate PostgreSQL suite verifies restart recovery, rollback and tenant/branch access. Cloud credentials, real checkout, both real POS systems and cloud infrastructure are not verified by these tests. Use the GitHub acceptance checklists to record external evidence later.

# Local loyalty demonstration

This isolated demo demonstrates enrollment → synthetic POS purchase → token ledger → simulated Wallet update → reward issue → staff marks fulfillment. It runs independently of WhatsApp, QR menu, payment gateways, POS accounts and the existing ordering database. Spanish is the initial language, with full English controls and messages. Restaurant timestamps use America/Santiago.

This is a **synthetic restaurant presentation**, suitable for rehearsing with a prospective restaurant, not operating a live customer loyalty program. The customer/staff/restaurant tabs are perspectives using one local owner key, not separate authenticated roles. Only synthetic names/data should be entered.

## Source and assumptions

The founder supplied the complete original specification archive and standalone README. All originals were imported on the authorized Mac and verified against supplied hashes; see [the original specifications index](sources/original-platform-specs/INDEX.md), [provenance](sources/original-platform-specs/PROVENANCE.md) and [current adaptations](sources/original-platform-specs/CURRENT-ADAPTATIONS.md). The source explicitly stages MVP-A staff-assisted loyalty, MVP-B Google Wallet and MVP-C automated POS, with the platform ledger authoritative. This slice covers a substantial demonstration subset, not every production requirement.

The illustrative seed uses 1 token per CLP 1,000, coffee for 5 tokens, and a CLP 2,000 discount for 10 tokens. The owner can change earning rate and reward costs. These values, per-purchase floor rounding, token reservation by ledger debit with a ten-minute authorization, reasoned manual single-use fulfillment/cancellation, full-sale reversals and negative balances after spent-token refunds are demo policies awaiting source/restaurant approval. Changes affect future purchases/redemptions only. Discount value and reward labels remain seed fixtures.

## Start locally

Use Node 24+ from the repository root:

```sh
npm ci
npm run demo:loyalty
```

Open `http://127.0.0.1:3001/loyalty` and enter the temporary panel key printed by the process. Keep the terminal running. Ctrl-C stops the demo cleanly. This launch script intentionally does not load `.env`, connect to PostgreSQL, start WhatsApp transport or read payment credentials. The existing `npm start` behavior is unchanged and does not expose loyalty routes.

State is saved to `.demo/loyalty.json` (Git-ignored) after successful mutations. Restarting retains members, balances, ledger, idempotency receipts, reward use and provider simulation state. A second process using the same snapshot is refused by a lock directory. After an unclean shutdown, stop/verify absence of the old process before removing only `.demo/loyalty.json.lock`. Do not run multiple processes against a snapshot; this is not distributed storage. Atomic rename protects normal process/write failures; power-loss guarantees, backups and production persistence are outside this demo.

Optional configuration: `LOYALTY_DEMO_PORT`, `LOYALTY_DEMO_FILE` (a dedicated synthetic snapshot path), and `LOYALTY_DEMO_TOKEN` (16+ characters, supplied securely). Never commit real tokens. The script always binds loopback. It is not a public deployment or a phone-accessible hosted pass. The verified checkout is prepared on the authorized Mac; keep its local process running during the presentation.

## Five-minute bilingual walkthrough

1. Open the panel, choose Español or English, and keep Ana selected. In Cliente / Customer, click **Simular actualización del pase / Simulate pass update**. The simulated card shows an opaque random card ID and zero tokens. Copy that card ID for lookup.
2. In Personal / Staff, paste that ID in the simulated scanner lookup. Register a CLP 10,500 pickup purchase. The ledger and local balance show +10 tokens; the existing simulated card updates. Repeat the last POS event: the balance and ledger must remain unchanged. Change visit type for a separate dine-in example.
3. In Cliente / Customer, request coffee (5 tokens) or the CLP 2,000 discount (10 tokens). The local balance decreases once and an issued voucher appears. In Personal / Staff, register simulated fulfillment. Enter a completion reason and synthetic transaction reference (for example `demo-receipt-1`) before fulfillment. The server requires the ten-minute authorization and rejects reuse. Alternatively supply a reason and cancel an unfulfilled reservation; a new compensating ledger entry returns tokens. Expired reservations cannot fulfill and can be cancelled explicitly.
4. In Restaurante / Restaurant, disable simulated Wallet availability. Add a purchase in Staff. Ledger truth advances; the card stays at its earlier balance. Try to synchronize: it reports provider unavailability. Restore provider availability and synchronize again: card catches up without earning tokens twice.
5. Reverse a purchase from Staff. Its original awarded tokens are reversed once even if the earning rule changed. A refund after spending may leave token debt; subsequent earning offsets the debt before redemption. In Restaurant, review/edit illustrative earning and reward costs, record a reasoned signed adjustment, revoke/replace the selected card ID, or confirm **Restablecer demo / Reset demo** to restore the two zero-balance seed members.

A reward marks a local simulated fulfillment only: no discount is applied to a real order and no food ticket is sent. Member lookup accepts a pasted identifier; camera scanning/barcode rendering remain pending. The HTML preview is not a Google Wallet object, signed save link, or installable pass.

## Implemented boundaries

| Component | Actual behavior |
| --- | --- |
| Local domain | Server validates integer CLP, computes floor tokens, records append-only ledger entries and reward snapshots, checks balances, expiring single-use reservation authorization, reasoned manual completion and cancellation compensation |
| Replay | Purchase event/request identifiers retained with payload fingerprints; changed replay payloads rejected; serialized writes prevent overspending |
| Persistence | Dedicated single-process atomic JSON snapshot; no changes to existing restaurant SQL schema or state |
| Wallet | Local projection, explicit outage simulation and recovery; no Google request or issuer credentials |
| POS | Staff submits synthetic completed sale/full reversal events; no vendor authentication, order creation or real payment |
| Access | Existing bearer protection; fixed synthetic restaurant; no tenant/body-supplied scope; no customer self-service or separate staff identities |
| UI | Spanish/English; native browser modules; same-origin calls; token held in page memory; only language persisted in browser |

API is `/api/demo/loyalty`: `GET /state`; `POST /members` (explicit loyalty acceptance, no marketing consent), `/members/:id/revoke-barcode`, `/adjustments` (nonzero signed delta and reason), `/sales`, `/redemptions`, `/redemptions/:id/use` (authorization, reason, transaction reference), `/redemptions/:id/cancel` (reason), `/sales/:id/reverse`, `/wallet/:memberId/sync`, `/program`, `/wallet-availability`, `/reset`. Schemas reject extra fields; every route requires the local bearer key. Business errors are localized with Accept-Language. There is no unauthenticated live checkout webhook. Ledger/reset/configuration are all synthetic and cannot alter existing ordering state.

## Validation and remaining work

`npm run check` and `npm test` cover the application plus loyalty earning/replay/conflicting payloads, concurrent redemption, immutable versioned reward/rate snapshots, expiring authorization, reasoned one-time fulfillment/cancellation, manual adjustment/auth/reason, consent/card revocation, reversal/debt, Wallet outage/recovery, snapshot restart/write failure/reset, authenticated API/validation/localization and opt-in isolation. The reproducible optional browser rehearsal is `python3 scripts/rehearse-loyalty-browser.py` with Python Playwright installed and Chromium available (or set `CHROMIUM_PATH`). It starts/stops isolated processes, uses disposable snapshots, tests both languages, desktop/mobile layout, member lookup/enrollment, rule edits, restart/reset, and loss of an already-committed purchase response followed by safe retry. It writes synthetic screenshots under ignored `.demo/evidence/`. PostgreSQL tests are not needed for this slice because no SQL schema or storage path changes.

Before a real restaurant pilot:

- Use the imported original specification archive to finish reconciling business rules, points expiry, refund/partial refund/cancellation policy, enrollment consent, member identity and reward configuration.
- Add tenant/branch-scoped durable storage, individual owner/operator/viewer authorization, customer identity/consent, audit actor retention, backup/restore and operational controls; migrate away from a single local owner console.
- Obtain authorized Google Wallet issuer access; implement real class/object identifiers, signed issuance, secure barcode identity, asynchronous update/retry/reconciliation; prove installation and dynamic updates on a real device. Never infer success from this preview.
- Select/authorize the restaurant's POS connector, verify signed sale/refund events, canonical eligible spend/order identifiers, receipt mapping, partial refunds, duplicate/reordered events and reward discount/item fulfillment. Independently validate each vendor; fixtures prove neither Fudo nor Toteat integration.
- Add actual camera/scanner workflow and customer-facing session separation; verify physical pickup and dine-in fulfillment with restaurant staff.
- Keep the reviewed checkout local on the authorized presentation laptop, or separately approve a hosted environment with HTTPS and appropriate secrets/retention. No external hosting or publication is performed by this change.

## Adaptation of original specifications

The source researcher's review found 19 Markdown documents plus FILE_MANIFEST.txt under `restaurant-platform-specs/`. The separately attached README is byte-identical to the archive README. The original stack proposed Next.js/React, NestJS, Prisma and pnpm. This implementation intentionally retains the working repository's Node 24/TypeScript, Fastify, native browser modules and existing SQL-migration conventions. No stack migration is implied.

| Original requirement | This demo | Remaining production work |
| --- | --- | --- |
| Versioned authoritative earning rules | Immutable rule-history snapshots and sale rate/version; integer CLP/floor rounding | Eligible categories/subtotals, branch restrictions, multipliers and configurable reversal policy |
| Member identity and consent | Opaque revocable card token; exact member-ID/token lookup; explicit loyalty acceptance; no marketing consent or fuzzy merges | Customer authentication, phone/email verification, real QR/barcode rendering/scanning, privacy/consent versioning |
| Authoritative paid/closed earning | Explicitly synthetic paid/closed POS event; duplicate/conflicting receipts guarded | Signed provider verification and actual eligible paid-order facts |
| Permissioned adjustments | Local owner bearer key, reason, actor marker and immutable ledger entry | Individual scoped owner/operator identities and policies |
| Atomic reservation/completion | Serialized balance check/debit, ten-minute authorization, reason plus synthetic transaction reference, one-time use; cancellation via compensating credit | Database transaction/locking, tenant/branch/reward/order policy enforcement, automatic expired-reservation cleanup |
| Wallet projection and retry | Ledger authoritative; outage does not alter eligibility; explicit synchronization and last-success timestamp | Real class/object/save link, transactional outbox, retry/backoff, persisted sync failure/reconciliation workflow |
| Scope and persistence | Fixed synthetic restaurant; extra scope fields rejected; production database/live transport combination refused; locked atomic JSON snapshot | PostgreSQL ledger/balance/outbox transactions and multi-tenant/branch isolation tests |

These gaps are explicit demo adaptations, not completed acceptance criteria. A local JSON snapshot is not equivalent to the original PostgreSQL transactional ledger/balance/outbox design. The demo never calls simulated earning a real financial event and never treats a scan alone as authorization. Adjacent modules and provider credentials are not prerequisites to launch.

## Mac verification: 30 October 2026

The patch was transferred through the supported Library flow and its 117,321 bytes verified against SHA-256 `cd9721cce46587e19e1bfa078196e2c1296d3d9a105eb9a30a6fcca3fc429183`. It was integrated with current main and the byte-verified original source archive. All 21 imported original files remain unchanged.

On Node 24.3.0, type/browser syntax checks and all 37 application tests pass. The isolated Chromium process rehearsal passes Spanish/English, desktop/mobile layout, purchase/replay, reward completion/cancellation, Wallet outage/recovery, full reversal, restart/reset, owner rules, member enrollment/lookup, card revocation, reasoned adjustment, literal HTML-name rendering, keyboard focus and lost committed-response replay. A local review fixed the browser retry cache so a definite 4xx rejection can be corrected while uncertain/5xx outcomes retain their request identity; the browser rehearsal verifies corrected fulfillment after a rejected blank reason. Synthetic evidence is in ignored `.demo/evidence/desktop-en.png` and `mobile-es.png`.

The visible in-app browser was also independently rehearsed on `http://127.0.0.1:3001/loyalty`: opaque-card lookup, CLP 10,500 → 10 tokens, duplicate event with no extra earning, five-token reservation, rejected then corrected fulfillment, English switch, Wallet outage with continued earning, and recovery to the authoritative balance. No real customer data or provider calls were used.

The running service is a foreground task-owned process, not an installed login/background service. It remains available while that process and this Mac are running. Restart from this checkout with `npm run demo:loyalty`; obtain its new temporary owner key from the terminal. Snapshot persistence is single-process local JSON, not PostgreSQL. Database/provider/physical scanner/real-device Wallet acceptance was not run or claimed by this slice.

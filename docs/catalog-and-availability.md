# Shared catalog, availability and manual import (#7)

## Implemented scope and provider gate

This change implements the catalog code that can be verified without restaurant accounts: product/modifier mappings for both POS providers, bilingual labels, integer CLP prices, versioned edits and quotes, service availability, manual import and staff correction controls. QR-menu entitlement remains disabled and is not a dependency.

**Issue #7 remains open for provider-account evidence and restaurant approval.** The canonical import format is our shared model; it is not a guessed Toteat or Fudo native payload. The real adapters in #13/#22 must transform authenticated provider data and verify mappings against the authorized restaurant accounts from #2. The example codes beginning `SIM-` are synthetic and must never be submitted to a live POS. Manual review by a staff token does not prove provider validation or kitchen acceptance.

## Staff controls

Sign in, choose Spanish or English, and select **Load catalog / Cargar catálogo** below the order workspace. Owner/operator staff can pause/resume ordering, mark the shift closed/open and mark products sold out/available. Viewer accounts have read-only access. Shift status is explicitly staff-confirmed; no live POS shift feed is connected.

The owner can expand **Edit items, prices and hours** to change names, prices, POS codes, extras and local service hours. Native form constraints handle missing fields and price bounds; the server validates the complete document and permissions. The owner must confirm a manual review before saving. Saving refreshes the review timestamp and increments the branch catalog version. Stock/shift toggles increment the version but do not refresh stale menu prices. Unsaved owner edits must be saved or explicitly discarded before reloading or applying another operation.

Each update sends `expectedVersion`. Concurrent/stale edits receive a conflict and must reload; there is no silent overwrite. Missing products from a replacement are retained as unavailable rows for historical order references. The editor supports up to 200 stored products, five optional extras per item and 21 service intervals. Required/exclusive modifier groups are outside this POC; import only the optional extras the flow can express.

## Canonical file import

`examples/catalog.sample.json` is a **simulation fixture**. Replace codes/content with the approved branch's authoritative mappings for an eventual pilot. Match `expectedVersion` to the current value from the panel or authenticated `GET /api/catalog`; otherwise the import fails. The `manualApproved: true` field is an explicit operator assertion that the menu has been reviewed, not proof of the separate restaurant sign-off.

For a trusted owner/developer workflow, set `DATABASE_URL` and `CATALOG_STAFF_TOKEN` privately in the environment (or ignored `.env`), then run:

```sh
npm run db:import-catalog -- examples/catalog.sample.json
```

The CLI uses the same authenticated transaction, owner permission check and domain validator as the API. Credentials do not go in command arguments or import files. Files are bounded to 128 KiB, and no file is uploaded to an external service. The command operates only on the token's branch; tenant/branch properties in the import are rejected.

Product IDs are customer-facing numeric codes `1`–`9999`; modifier IDs use lowercase ASCII letters/digits/underscore/hyphen and start with a letter. Every product/extra has Spanish and English names, nonnegative integer `price` in CLP, `available`, and optional `mappings` containing exact opaque `toteat`/`fudo` identifiers. Imported prices are bounded to CLP 1,000,000 per item/extra; order totals are bounded below the SQL integer limit. Fractional, negative, duplicate or unknown fields are rejected before mutation. An available manually imported selection without its selected POS mapping cannot be added to a cart or checked out. The other provider's mapping can be stored independently.

## Customer selection and safe confirmation

Customers use any listed numeric item code, for example `42 x 2`. Optional extras use `42+cheese x 2`; multiple extra codes can be joined with `+`. The selected codes appear in the menu and the same syntax works in Spanish/English. Quantity is 1–20 per distinct selection. `remove 42+cheese` / `quitar 42+cheese` removes that selection. Invalid, repeated, unsupported or unavailable extras do not mutate the cart. Menu display and confirmed snapshots include localized extra names and prices.

Each cart review persists a five-minute quote with catalog version, cart identity, exact line selections/provider mappings and total. A price, availability or mapping change, a changed cart, or expiry requires review of a fresh quote and another explicit confirmation before creating checkout. A silent direct price mutation is also detected by comparing the priced lines. Repeated confirmation recovers an already confirmed order and its immutable amount rather than repricing it.

The confirmed order retains the catalog version, provider product ID and selected modifier IDs/names/prices. PostgreSQL preserves these and the quote across requests/restarts. Historical order lines are not rewritten when the current catalog changes. This supplies the quote foundation for #8; its separated financial/fulfillment state machine and full event contracts remain outstanding.

## Availability rules

Confirmation and first simulated payment/kitchen submission require `acceptingOrders`, `shiftOpen`, an allowed local service interval and a non-stale review. Browsing/cart review remain available while closed. Existing paid/preparing orders remain visible and can proceed to pickup. Real late-settlement/paid-but-closed handling remains #15/#17.

`maxAgeMinutes` is 1–10080; the default is 1440. A staff stock or shift toggle cannot make stale prices fresh. Only a reviewed catalog replacement refreshes `updatedAt`. All changes use the branch lock and transaction, so quote checks see a consistent catalog.

Hours use the branch timezone (`America/Santiago` initially), with weekday `0=Sunday` through `6=Saturday`, `HH:mm` opening/closing times, opening inclusive and closing exclusive. A closing time earlier than opening extends into the next day; equal times are rejected. No intervals explicitly means unrestricted hours for the demo/manual schedule, still subject to the open/accepting/review checks. Santiago daylight-saving changes are handled through `Intl.DateTimeFormat` timezone data.

## HTTP surface

All routes use authenticated restaurant/branch scope and return Spanish/English errors using `Accept-Language`. Unknown body properties, including attempted tenant overrides, are rejected. Domain validation returns 400, stale-version/availability/selection conflicts return 409, and insufficient roles return 403.

| Route | Permission | Body |
| --- | --- | --- |
| `GET /api/catalog` | owner/operator/viewer | None |
| `POST /api/catalog` | owner | Canonical import document |
| `POST /api/catalog/products/:id/availability` | owner/operator | `expectedVersion`, `available` |
| `POST /api/catalog/service` | owner/operator | `expectedVersion`, `acceptingOrders`, `shiftOpen` |

Migration `002_catalog_availability.sql` is additive. It persists review/version/source/availability on the branch, mappings/extras on products, quotes on conversations and selection snapshots on order lines. Existing seed menus and historical orders remain valid. All domain changes and audit entries commit or roll back together. Real provider ingestion, verified availability feeds and restaurant acceptance evidence remain explicit follow-up gates.

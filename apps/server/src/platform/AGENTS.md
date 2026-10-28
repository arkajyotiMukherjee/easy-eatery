# Shared domain, catalog, ordering and locale

`domain.ts` defines tenant/session/cart/quote/order types, `MemoryStore`, pricing, snapshot construction and `DomainError`. `catalog.ts` owns strict import validation, modifiers and provider mappings, versioned changes and service hours. `ordering.ts` owns confirmation, simulated checkout/POS, local pickup acceptance, store payment recording, allowed transitions and dashboard metrics. `i18n.ts` owns server error codes and Spanish/English messages.

Graph seeds: `MemoryStore`, `CatalogService`, `OrderingService`, `validateCatalogImport`, `withinHours`. Follow callers to conversation, HTTP, persistence and catalog tests before changing a public contract.

Validate availability, modifiers, provider mappings and integer CLP pricing server-side. `confirm` must reject expired/version-changed/cart-changed quotes and direct line changes; retain immutable order snapshots. Keep payment method/state separate from fulfillment and operational status. Local pickup cannot be collected before staff records store payment; simulated payment must not process a pickup payment. Select one POS provider per branch/order. Shared services must remain reusable by future channels without depending on WhatsApp.

Run `npm test` (catalog, POC and pickup cases). Type/serialization changes also require persistence SQL, migrations and database integration review. Keep error keys and both languages aligned.

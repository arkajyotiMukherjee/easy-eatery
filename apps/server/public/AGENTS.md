# Browser dashboard and catalog UI

Native ES modules: `app.js` handles API auth, chat, dashboard, pickup actions and locale; `catalog-ui.js` exports `createCatalogPanel`; `i18n.js` contains browser copy; `index.html` and `style.css` define semantic layout and presentation. Graph seeds: `createCatalogPanel`, `renderDashboard`, `translatePage`, `api`.

Keep the bearer token in page memory, insert untrusted content as text and preserve same-origin requests and server CSP. Only language preference belongs in localStorage. Role-based controls improve UX; server authorization remains authoritative. Preserve Spanish/English copy, accessible names, document lang and locale-aware CLP/date formatting. Show simulation and local pickup states accurately; browser actions do not establish provider payment settlement.

Align API fields with `../src/app.ts` and domain services. New assets need the server's allowlist. `npm run check` checks browser syntax; `npm test` covers API contracts. Visually inspect changed flows with keyboard/mobile and both languages; no automated browser suite currently exists.

The PostgreSQL delivery panel shows only scoped counts and redacted exception metadata. Owners/operators explicitly acknowledge cause correction before retrying a known failure, or reviewed follow-up before resolving an uncertain outcome without resending. Preserve optimistic `expectedVersion`, server role enforcement and truthful provider-acceptance labels. Viewer controls are read-only. Clear exception data when credentials change; never render sender addresses, messages, provider identifiers or panel credentials. Refresh and language changes reset acknowledgements.

Receipt facts are independent: show provider acceptance separately from sent/delivered/read/failure events, without treating absent evidence as failed delivery. Label reply versus notification sources because their numeric IDs can overlap. `sandbox-ui.js` owns Webpay sandbox actions and its local-only test checkout link. Sandbox orders must bypass simulation-pay and pay-at-pickup controls. Keep test-authorized CLP totals separate from revenue, and label sandbox kitchen mode in both languages.

Help requests use explicit reviewed-without-contact acknowledgement, preserve server role enforcement and clear on credential changes. A review does not claim customer contact. Closed customer-service windows are labeled as staff follow-up rather than uncertain delivery.

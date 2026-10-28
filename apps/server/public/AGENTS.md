# Browser dashboard and catalog UI

Native ES modules: `app.js` handles API auth, chat, dashboard, pickup actions and locale; `catalog-ui.js` exports `createCatalogPanel`; `i18n.js` contains browser copy; `index.html` and `style.css` define semantic layout and presentation. Graph seeds: `createCatalogPanel`, `renderDashboard`, `translatePage`, `api`.

Keep the bearer token in page memory, insert untrusted content as text and preserve same-origin requests and server CSP. Only language preference belongs in localStorage. Role-based controls improve UX; server authorization remains authoritative. Preserve Spanish/English copy, accessible names, document lang and locale-aware CLP/date formatting. Show simulation and local pickup states accurately; browser actions do not establish provider payment settlement.

Align API fields with `../src/app.ts` and domain services. New assets need the server's allowlist. `npm run check` checks browser syntax; `npm test` covers API contracts. Visually inspect changed flows with keyboard/mobile and both languages; no automated browser suite currently exists.

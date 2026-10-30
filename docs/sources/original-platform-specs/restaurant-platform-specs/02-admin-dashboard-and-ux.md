# Restaurant Owner Admin Dashboard & Shared UX

## 1. Purpose

One control plane for the restaurant owner to manage purchased modules, branches, integrations and operations. The interface must make it obvious which services are active, what setup remains, what is working, and which modules could close more of the customer's operational loop—without making unpurchased modules block daily work.

Default locale: `es-CL`; currency `CLP`; timezone `America/Santiago`. Internal development may use English identifiers; customer UI should be natural Chilean Spanish reviewed by the partner.

## 2. Main information architecture

- **Inicio:** operational summary, onboarding checklist, recent issues, quick actions.
- **Módulos:** catalog of available modules with status `No contratado`, `Configuración pendiente`, `Activo`, `Requiere atención`, `Pausado`.
- **Pedidos** (only when order capability/module enabled): order list, detail, status, source/channel filter.
- **Carta y productos:** shared catalog editor, availability, modifiers, image management; surfaced when required by QR or pickup.
- **Clientes** (when CRM/loyalty is enabled): profile, consent, purchase history, points, source attribution.
- **Campañas** (when messaging capability purchased): audiences, templates, preview, scheduled/sent results.
- **Eventos y cotizaciones** (catering module): inquiries, price/package settings, quote versions and statuses.
- **Integraciones:** POS, payments, Google Wallet, WhatsApp, email; capability matrix and last sync/error.
- **Sucursales:** address, hours, pickup windows, timezone, local menu overrides, POS connection.
- **Equipo y permisos:** invite staff, assign branch and role.
- **Suscripción y uso:** modules, renewal status, usage counters, invoices/receipts provided by platform billing.
- **Configuración:** business profile, branding, language, notifications, privacy/consent defaults and data export requests.
- **Ayuda:** searchable setup guides, contact route, status and request ID.

Navigation must hide unavailable module pages or present a clear read-only upgrade/configuration page; do not allow a hidden feature to be called by manipulating the URL.

## 3. Roles

- `owner`: all tenant settings, team, subscription, data export/delete requests, integrations and finance configuration.
- `manager`: daily operations and allowed module configuration; cannot transfer ownership or see billing secrets.
- `staff`: scoped operational tasks (e.g. kitchen updates, lookup/redeem loyalty subject to policy); no campaign export or integration secrets.
- `marketing`: CRM segments/campaigns and consent-safe exports; no payment credentials or kitchen controls unless separately granted.
- `kitchen`: order board and allowed order state transitions only.
- `platform_support`: internal support access is audited, time-bound and tenant-visible where feasible; default read-only and never access raw payment credentials.

Use permissions rather than an ever-growing list of hard-coded roles. Enforce permissions at the API, not just nav rendering.

## 4. Owner onboarding flow

1. Create account and verify contact.
2. Create restaurant (legal/commercial fields only as needed; avoid collecting sensitive tax docs before required).
3. Add first branch, address, business hours and pickup availability if relevant.
4. Choose modules; show plain-language value, monthly price/usage basis, required capabilities and optional integrations.
5. Configure shared catalog only if chosen module needs it; permit POS import or manual starter catalog.
6. Connect provider or choose temporary/manual fallback if pilot supports it.
7. Run a checklist and a real test task: preview menu, create sample pickup order, issue test quote or test a loyalty pass.
8. Show ready state, support contact and explicit next step.

Onboarding should be resumable. Persist completed checklist steps. Never force QR setup if QR menu is not purchased.

## 5. Home page composition

Top: branch selector and service health. Then:
- Today's relevant metric cards only: order volume/ready queue, new leads/quotes, loyalty members, campaign deliveries depending on entitlements.
- “Needs attention” list with action buttons: POS sync failed, payment confirmation pending, Wallet update retries, WhatsApp credentials disconnected, quote rules incomplete.
- Recent activity timeline, with filters by module.
- “Finish setup” checklist for modules with `setup_status != ready`.
- Optional “Connect another service” recommendations based on user-selected goals, not dark patterns.

Do not show fake empty dashboards populated with fabricated analytics. Explain when data is not available because a module/integration is off.

## 6. Core admin pages and interaction patterns

### Module catalog
Cards include description, included features, price/usage basis, dependencies, branch scope, setup effort, status and enable/disable action. Enabling must preview changed price and required permissions before confirmation.

### Integrations page
For every connection show: provider, branch, connection state, requested scopes/capabilities, last successful sync, last error category, sync cursor/time, rotate/disconnect actions, test-connection action, docs link and support request ID. Secrets are write-only after saving and masked thereafter.

### Order list / kitchen board
Keep kitchen mode visually clear and touch-friendly. Large readable status lanes, low interaction count, audible alert optional, stale-connection banner, optimistic updates with server acknowledgement, manual refresh/reconnect indicator, and order detail with item modifiers/allergens/notes, promised pickup time and payment status distinct from production status.

### Customer profile
Display identity confidence/source, consent status by purpose/channel, last visit, order history, points ledger and campaign history. Provide “unlink identity” and privacy request path. Never display full payment credentials.

### Quote builder
Show total in CLP, included items, guest count, event date/time, staffing and assumptions, validity window, tax treatment configured by owner/adviser and a versioned quote preview before PDF/send.

## 7. Responsive design modes

- Owner admin: desktop-first, responsive mobile.
- Kitchen board: tablet/desktop landscape, low visual density, touch-friendly.
- Public menu/pickup: mobile-first, fast and low friction.
- Catering quote form: mobile and desktop, progress steps, save/resume via email link only if needed.

## 8. Accessibility and errors

Target WCAG 2.2 AA where practical: keyboard navigation, visible focus, label associations, contrast, screen-reader announcements for async status, no status communicated by color alone. Every network failure must preserve customer input and present a retry path. Do not display raw stack traces or provider responses.

## 9. UX analytics

Record non-sensitive events: onboarding step completed, module activated, integration tested, order submitted, checkout outcome, quote generated/accepted, campaign preview/approved. Do not send PII or free-text conversation content to analytics. Use analytics to identify onboarding friction, not to create customer surveillance.

## 10. Dashboard acceptance checklist

- Owner can enable pickup and catering without enabling QR.
- A user without an entitlement cannot access that module via URL/API.
- Owner can see exactly which integration capability is missing and why.
- Kitchen sees only permitted branches/orders.
- A disconnect or external-provider outage is visible with recovery guidance.
- All business-facing copy is Spanish (Chile) and currency/time presentation is localized.

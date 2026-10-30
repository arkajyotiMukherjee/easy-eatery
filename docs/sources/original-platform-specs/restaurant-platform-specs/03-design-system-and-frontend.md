# Shared Design System & Frontend Standards

## 1. Product feel

Aim for professional, calm, trustworthy restaurant software: warm-neutral surfaces, clear typography, a single brand accent, restrained status colors, strong hierarchy and high legibility in kitchens. Avoid making the admin dashboard look like a developer console. Public-facing menus can inherit restaurant branding while retaining accessible component behavior.

## 2. Shared frontend stack

- Next.js App Router + React + TypeScript.
- Tailwind CSS and shadcn/ui (Radix primitives) maintained inside `packages/ui`.
- Icons: Lucide React.
- Forms: React Hook Form + Zod.
- Data fetching/cache: TanStack Query for interactive authenticated screens; use server rendering/static caching where suitable for public menu pages.
- API client generated from OpenAPI or typed from shared contracts; no ad-hoc `fetch` calls scattered across modules.
- Playwright for design-critical flows on mobile and desktop.

## 3. Tokens

Define semantic tokens, not component-specific hex values:

- `--background`, `--surface`, `--surface-raised`, `--foreground`, `--muted-foreground`, `--border`, `--primary`, `--primary-foreground`, `--secondary`, `--destructive`, `--warning`, `--success`, `--focus-ring`.
- Status must include text/icon and not rely on color alone.
- Tenant brand customization may override approved accent/logo/image tokens only. Do not allow tenants to override accessibility tokens or arbitrary CSS.
- Theme is light-first; dark mode is optional admin setting later, not a first-launch requirement.

## 4. Layout patterns

- Admin shell: left navigation, top branch selector, page title + primary action, main content, contextual side panel only where useful.
- Public catalog: brand header, category anchor list, search/filter if catalog warrants it, product cards, fixed cart action for pickup ordering.
- Kitchen: status columns or lanes, high contrast, large touch targets, explicit reconnect/last-updated state.
- Wizard forms: step indicator, clear required/optional fields, save/resume where user investment is significant.
- Empty states always explain why empty and offer the next useful action.

## 5. Localization for Chile

- Spanish-Chile copy review by native/local partner. Avoid unreviewed machine-translated UX.
- CLP format with locale-aware `Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })`; no decimal cents for ordinary CLP display unless provider transaction detail requires it.
- Store instants in UTC; display with `America/Santiago`; recurring schedules stored in local civil time plus IANA zone to handle daylight-saving changes.
- Phone collection: normalize to E.164; Chile numbers often `+56`; validate rather than assume.
- Dates: local Chilean format; distinguish pickup day/time and quote validity.
- Quantities use metric units; allergen/food labels editable by restaurant and not invented by AI.

## 6. Public menu performance

- Render a small critical path; lazy-load menu images; use modern image formats and responsive sizes.
- CDN-cache public published menu responses only with versioned keys/ETags and short invalidation path.
- Do not cache customer-specific order, loyalty or account data in shared edge caches.
- Ensure public QR slug is stable; QR content is a URL, not a serialized menu or secret token.
- Test on mid-range Android mobile and constrained network.

## 7. Frontend security

- Treat all form values and query parameters as untrusted.
- Keep provider secrets exclusively server-side.
- Use secure, HttpOnly, SameSite cookies for sessions when cookie auth is selected; CSRF defense for state-changing cookie-auth endpoints.
- Avoid dangerous HTML injection for menu descriptions; sanitize rich text.
- Use CSP, secure headers, dependency scanning and no secrets in client env variables.
- Hide/disable buttons based on permissions for UX, but always enforce server-side.

## 8. Frontend acceptance checklist

- All primary flows usable at 360px width and on tablet landscape.
- Keyboard focus visible, labels accessible, loading/error/empty/success states included.
- No price, points balance or entitlement decision trusted from client state.
- Shared components are used consistently across modules and include interaction tests.

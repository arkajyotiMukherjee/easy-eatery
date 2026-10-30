# Module Specification — QR Digital Menu

## 1. Product contract

**Commercial module:** `qr-menu`  
**Purpose:** A fast, mobile-responsive public menu accessed through restaurant/table QR codes. It is optional and must never be a dependency for pickup, WhatsApp ordering, CRM, loyalty or catering.

### Required capabilities
- `catalog.read_published`
- `public_storefront`
- tenant/branch branding and public slug

### Optional integrations
- Pickup cart/order service (only if restaurant has pickup ordering entitlement)
- Loyalty sign-in/reward display (only if loyalty is active and policy allows)
- Analytics events

## 2. MVP scope

- Publish menu by branch with categories, products, descriptions, images, CLP price, modifiers/add-ons, availability and optional allergen notes maintained by staff.
- Mobile-first public page with category navigation and restaurant branding.
- Stable QR URL per branch, optional table-specific URL if product design validates dine-in use.
- Preview/publish/unpublish and scheduled availability.
- CDN cache/invalidation for published public data.
- Analytics limited to page/menu views and click metrics without invasive tracking.

Out of scope: payment/order capture unless `pickup-ordering` is separately enabled; table service workflow; complex inventory; AI-generated nutrition/allergen facts.

## 3. Domain model

- `catalogs(id, tenant_id, branch_id, status, version, published_at)`
- `menu_categories(id, tenant_id, catalog_id, name, sort_order, active)`
- `menu_items(id, tenant_id, catalog_id, category_id, source, external_product_id, name, description, price_minor, currency, active, availability_json)`
- `modifier_groups` and `modifier_options` with min/max selection and price delta
- `menu_item_images(object_key, alt_text, sort_order)`
- `public_slugs(tenant_id, branch_id, slug, active)`
- `table_qr_codes(id, tenant_id, branch_id, table_label, slug_or_token, status)` if validated as necessary

Published items are read-only snapshots to the public storefront. Editing creates a draft/version and requires publish. Price/availability must be evaluated server-side when forming a cart.

## 4. Public routes

- `GET /r/:restaurantSlug/:branchSlug/menu` — published catalog.
- `GET /r/:restaurantSlug/:branchSlug` — branded entry point.
- Optional `GET /r/:restaurantSlug/:branchSlug/t/:tableCode` — table context, no secret data.
- Admin: catalog CRUD, reorder, availability updates, preview, publish.

Do not expose internal IDs or connection metadata. Use stable slug or random non-sensitive QR token. QR tokens can be revoked/rotated.

## 5. UX

- Menu landing page: branding, opening/availability information, categories, menu items.
- Item detail: modifiers, description and selected allergens/restaurant notes.
- Unavailable products should remain visible only if restaurant chooses “show unavailable”; they must not be added to cart.
- QR scan should arrive directly at the menu without requiring account creation.
- If pickup ordering is not purchased, no fake or nonfunctional cart/checkout button may appear. Optional CTA can link to telephone/reservation only if configured.

## 6. Data and integration behavior

- Catalog may be authored locally or imported from a POS adapter. Store `source` and external IDs.
- POS-sourced prices should show last successful sync and import conflict warnings. The restaurant must define whether POS or local catalog wins for price/availability.
- Catalog updates publish a `catalog.published.v1` event; CDN cache invalidation should be asynchronous and retryable.
- Do not let an integration failure unpublish the latest working menu without an explicit policy.

## 7. Acceptance criteria

- QR menu works when all other commercial modules are disabled.
- Pickup ordering still operates if QR module is disabled.
- Published menu is mobile responsive, accessible and cached safely.
- A staff member can update availability without developer help.
- Stale POS sync shows a warning but does not corrupt manual entries.
- No client-side submitted price is trusted by a downstream order module.

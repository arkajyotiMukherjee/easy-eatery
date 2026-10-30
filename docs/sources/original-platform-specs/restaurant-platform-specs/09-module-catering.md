# Module Specification — Catering & Private Event Estimator

## 1. Product contract

**Commercial module:** `catering`  
**Purpose:** Self-service lead and quote flow for private dining, group bookings and corporate catering. It must function without QR menu, pickup ordering, loyalty or CRM campaigns.

## 2. MVP customer journey

1. Customer opens standalone restaurant-branded catering page.
2. Enters event type, date, start/end time, estimated guest count, location, service format and contact details.
3. Selects a configured package (e.g. Standard, Premium, Cocktail, Open Bar if applicable) and add-ons.
4. Sees an indicative estimate with assumptions and exclusions; if configured as a formal quote, owner-approved terms and validity appear.
5. Submits request; create a lead and quote version.
6. Generate PDF and send email or WhatsApp link after the contact-channel/provider is configured.
7. Owner/staff reviews, edits, approves, sends revised quote, records acceptance/rejection/expiry and follows up.

The calculator must clearly distinguish an indicative estimate from a binding offer. Legal/financial terms and tax behavior require local review.

## 3. Pricing engine

Use deterministic versioned rules, not an LLM. Inputs include guest count, menu/package, service hours, staff roles/count, setup/cleanup, equipment, travel/venue, optional beverages, add-ons, minimum spend and owner-defined seasonal/date multipliers.

Example rule model:
- package fixed price per guest;
- staff charge = roles × estimated hours × configured rate;
- setup/transport/equipment fixed or parameterized fee;
- optional items/contingency configured by owner;
- minimum guest count/minimum event price;
- owner-defined tax display rule reviewed locally;
- currency CLP, integer pesos.

Every price/rule set has a version. Each quote stores a full pricing snapshot; later price edits do not mutate already issued quotes.

## 4. Data model

- `event_leads(id, tenant_id, branch_id nullable, source, customer_id nullable, contact_name, contact_method, contact_value, consent_to_follow_up, event_type, event_date, start_at, end_at, guest_count, venue_location, requirements, status, assigned_user_id)`
- `catering_packages(id, tenant_id, name, description, active, version)`
- `catering_price_rules(id, tenant_id, package_id, version, rules_json, effective_from, effective_to, approved_by)`
- `quotes(id, tenant_id, lead_id, quote_number, version, status, currency, total_minor, valid_until, terms_snapshot, pricing_snapshot_json, created_by, approved_by, pdf_object_key)`
- `quote_items` immutable lines; `quote_events` status audit.

Lead should exist independently of CRM. If CRM is active, optional identity linking can occur using consent/matching rules; don't require CRM purchase to create a catering lead.

## 5. Statuses

Lead: `new -> qualifying -> quoted -> negotiating -> won/lost`; separate operational status from quote status.  
Quote: `draft -> approved -> sent -> viewed (if supported) -> accepted/rejected/expired/superseded`. Acceptance action needs authenticated secure link or owner confirmation; email opens alone do not prove acceptance.

## 6. PDF/communications

- Generate PDF server-side in worker; store private object, use expiring signed URL when necessary.
- Include restaurant name/contact, quote number/version, event assumptions, itemized quantities/rates/totals, explicit exclusions, validity, payment/deposit terms and status.
- Use Spanish (Chile) and CLP formatting.
- Email/WhatsApp delivery is asynchronous; document the send result and retry state.
- If provider is unavailable, allow owner to download PDF and send manually.

## 7. Admin screens

- Leads inbox with filters by event date, guest count, status and source.
- Lead detail and activity timeline.
- Package editor with preview and effective-date/versioning.
- Quote builder with live deterministic total and explicit warnings for missing/overridden pricing.
- Approval step for discounts beyond tenant thresholds.
- Quote history and download/send/revise actions.

## 8. Capacity and feasibility

MVP may accept a request without reserving actual venue capacity. If calendar/booking availability is not integrated, state “request submitted; date is not confirmed.” Do not promise availability based only on a quote calculator. Add availability/reservation workflows later if paid demand proves it.

## 9. Acceptance criteria

- Quote total is reproducible from stored snapshot.
- Editing package prices does not change previous quotes.
- PDF generation/send failure remains visible with manual download fallback.
- Catering works when CRM, QR, loyalty, WhatsApp and pickup modules are disabled; email fallback/manual review may be used.
- Customer consent and retention behavior is recorded.

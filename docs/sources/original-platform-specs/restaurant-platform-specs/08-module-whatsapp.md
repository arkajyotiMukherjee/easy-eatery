# Module Specification — WhatsApp Conversations, Ordering & Campaigns

## 1. Product contract

**Commercial module:** `whatsapp` (possible separately priced sub-capabilities: `whatsapp-support`, `whatsapp-ordering`, `whatsapp-campaigns`).  
**Purpose:** Use WhatsApp as a channel for support, ordering, event leads and permissioned outbound communication. WhatsApp ordering must function without QR menu and without the CRM campaign module. CRM segments enrich targeting only when CRM is active.

## 2. Integration rule

Use the official WhatsApp Business Platform/Cloud API directly or a provider that is explicitly authorized and has acceptable Chile coverage/pricing. Do not automate consumer WhatsApp Web. Pricing, templates, message windows, opt-in and category rules change; verify current official Meta docs and provider-specific fees before commercial release. Make the adapter provider-independent.

## 3. MVP scope (deterministic before AI)

- Connect/verify business phone and configure approved templates.
- Receive inbound message webhooks and respond using deterministic menu/FAQ/order flows.
- Capture catering inquiry and send confirmation.
- Create a cart/order through the shared order domain service.
- Generate a hosted payment link for an order where online payment is configured.
- Opt-in/opt-out/suppression management.
- Campaign audience preview, scheduled send and delivery/failure report only after campaign module and required consent rules are validated.

AI phase: intent classification, FAQ answer draft from restaurant-approved sources, guided menu recommendation. AI must not invent stock/price/pickup estimates, confirm payment or autonomously apply unapproved discounts. All tools that alter state require server-side authorization and deterministic validation.

## 4. Data model

- `messaging_connections(tenant_id, provider, business_account_ref, phone_number_ref, credential_secret_id, status, capabilities_json)`
- `conversations(id, tenant_id, customer_id nullable, channel, external_conversation_id, state, assigned_user_id, last_message_at, retention_deadline)`
- `messages(id, tenant_id, conversation_id, provider_message_id, direction, message_type, template_key nullable, delivery_status, timestamp, minimized_content_ref nullable, error_code)`
- `conversation_states(conversation_id, state_key, state_json, version, expires_at)` for cart/flow state; do not use untrusted AI output as state authority.
- `campaigns`, `campaign_audiences`, `campaign_recipients`, `template_registry`, `suppression_entries`.
- `message_events` dedupes provider delivery/read/failure callbacks.

Keep free-text retention short and configured; do not retain full transcripts indefinitely by default.

## 5. Order conversation state machine

`idle -> browsing -> cart_open -> awaiting_customer_confirmation -> order_created -> awaiting_payment (optional) -> paid/accepted -> complete`; exception states include `expired`, `cancelled`, `human_handoff`, `provider_failure`.

The flow must confirm order items, quantities, modifiers, branch, pickup time and total in user-facing language before creating a durable order. Reuse the same order service as web pickup. Use idempotency keys per conversation action so provider retries cannot create duplicates.

## 6. Payment link flow

- Backend creates an order/payment attempt and asks chosen payment adapter for hosted checkout URL.
- Message contains a time-limited or provider-valid link and clear order reference.
- Browser returning to WhatsApp or clicking a “paid” button never marks transaction paid.
- Provider webhook/verified query updates internal payment state.
- Send receipt/status message only after verified event.
- Expire/reconcile stale links and prevent multiple live attempts from being applied to the same order unless policy allows.

## 7. Outbound campaign workflow

1. User chooses a consent-safe segment or imports an eligible list.
2. System previews audience size and exclusion reasons.
3. Apply tenant timezone, quiet hours, frequency caps, do-not-contact, opt-outs, provider constraints and approved template rules.
4. Display estimated provider charges based on current configured rate table where available; do not guarantee cost until actual provider pricing is confirmed.
5. Require explicit approval before send.
6. Send in rate-limited batches with retries only where safe.
7. Process delivery/failure/opt-out webhooks; update suppression promptly.
8. Report sends, deliveries, failures, responses, order/lead attribution where lawful and measurable.

Do not import contacts or message people without an appropriate legal basis/consent. Do not bypass template approval or messaging windows.

## 8. AI behavior and guardrails

- Approved knowledge: restaurant FAQs, opening hours, policy, current published menu, pickup rules and approved catering packages.
- Use structured tool calls for catalog lookup, quote draft and order creation; validate every argument server-side.
- Never allow an LLM to construct arbitrary provider API requests or access other tenants.
- Treat user messages as untrusted input; tool permissions are narrow and tenant-scoped.
- Handoff to a person on ambiguity, complaint/refund, allergen uncertainty, failed payment, unsupported POS state or repeated failed turns.
- Display “assistant may make mistakes” only if useful; more importantly, operationally prevent unverified statements.
- Log tool/action outcome metadata, not unnecessary private transcript content.

## 9. Operational dashboard

Connection status, template status, inbound/outbound volume, current conversation queue, human handoff, failed messages, opt-outs, estimated costs, and test-message function. API errors must not expose access tokens.

## 10. Acceptance criteria

- Webhook retries do not duplicate messages or orders.
- Opt-out suppresses subsequent campaign messages across all scheduled jobs.
- AI cannot change price or mark payment as complete.
- Outbound campaigns cannot be sent without a preview/approval step.
- WhatsApp ordering can place an order with QR module disabled.
- Provider outage creates visible delayed/failed state and replay path.

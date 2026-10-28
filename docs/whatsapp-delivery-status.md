# Provider delivery-status evidence

After migration 007, PostgreSQL Cloud mode records signed WhatsApp `sent`, `delivered`, `read` and `failed` status events separately from queue processing state. The existing webhook HMAC check and receiving-phone mapping run before ingestion. Status-only callbacks do not start conversations, alter orders or trigger retries.

The normalizer accepts at most 100 statuses per webhook body (the HTTP body limit remains 128 KiB). It retains only bounded provider message IDs, recognized status, numeric provider timestamp and an optional numeric error code. Recipient IDs, error descriptions/URLs, message text and raw payloads are discarded. Unknown statuses and malformed fields are ignored. This is a bounded test-account ingestion path; confirm actual provider batching and retention policy before real traffic.

The unique scoped event key makes webhook replay idempotent. Events can arrive before the outbound acceptance receipt commits: they remain available for correlation when the matching job's provider message ID is saved. Matching includes tenant, branch and receiving phone, so a provider ID in another restaurant cannot supply this job's evidence. An unknown message ID does not resolve an uncertain send whose acceptance receipt was never saved.

## Read the evidence separately

Authenticated `GET /api/whatsapp/delivery/receipts` returns up to 100 replies/notifications with a saved provider acceptance ID for the staff member's branch. It exposes source (`reply` or `notification`) and queue ID/state and evidence flags, excluding recipient/account/provider identifiers and payload text:

- `provider_accepted`: the transport returned a provider message ID; acceptance alone does not prove device delivery.
- `provider_sent`: a signed `sent` event was observed.
- `device_delivered` / `device_read`: signed device delivery/read evidence was observed; read also implies delivery.
- `provider_failed`: a signed failure event was observed, retained even alongside delivered/read evidence.
- `delivery_status`: `read`, then `delivered`, then `failed`, then `sent`, otherwise `unknown`, using all retained events rather than arrival order.

A late `sent` or `failed` callback cannot erase prior read/delivered evidence. A contradictory failure is preserved in its own flag for review. `latest_provider_timestamp` describes the latest retained event time, not a promise that the events arrived in order or that a human read the message. No event automatically retries a send, changes a queue job to `sent`, releases a parked conversation, authorizes payment or advances kitchen fulfillment. Use the explicit [recovery workflow](whatsapp-recovery.md) for staff review.

## Local validation and remaining gates

`tests/whatsapp-status.test.ts` validates normalization, field bounds, account filtering and the absence of private descriptions in normalized data. `tests/whatsapp-status.integration.ts` validates signatures, duplicates, events preceding receipt commit, out-of-order evidence, cross-tenant provider-ID reuse and the separation of unknown send outcomes from device receipts, using synthetic statuses and fake outbound transport.

These tests establish local behavior. They do not prove an approved sender/recipient, provider subscription, real-device status delivery or a real-phone ordering loop. Those gates remain in the cloud handoff. No provider account or real message was used for this validation.

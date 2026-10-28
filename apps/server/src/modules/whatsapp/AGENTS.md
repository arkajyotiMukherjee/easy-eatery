# WhatsApp conversation

`conversation.ts` is the deterministic bilingual command handler. `Conversation.receive` serializes each customer's work; `process` normalizes commands, checks module entitlement and caches replies by tenant/customer/message; `handle` translates commands into shared cart/ordering operations; `cartSummary` refreshes the displayed quote.

Graph seeds: `Conversation`, `OrderingService`, `cartSelection`. Transport/signature parsing is in `../../integrations/whatsapp.ts`; durable jobs/delivery claims are in `../../persistence/whatsapp-queue.ts` and ingress is in `../../app.ts`; domain decisions belong in `../../platform/`.

Preserve Spanish default and explicit English/Spanish switching, stable product/modifier IDs, quantity bounds, candidate-cart validation before mutation, quote review on changed confirmation and cached duplicate replies. Confirmed orders cannot silently mutate their carts. Preserve truthful copy for simulation versus pay-at-pickup. In-memory queues do not provide distributed serialization; database branch locks provide scoped unit-of-work serialization.

Run `npm test`, especially POC language/replay, catalog quote/modifier and pickup flows. Run database integration tests for persisted replay or session changes.

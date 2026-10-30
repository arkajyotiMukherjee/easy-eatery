# Current adaptations and precedence

Snapshot: 30 October 2026. These notes interpret the source archive alongside explicit current founder direction and the existing repository. They do not change the original documents.

- Runtime: preserve Node 24+, TypeScript ESM, Fastify and browser-native UI. Earlier Next.js/NestJS proposals are architectural options, not a request to migrate frameworks. Root `AGENTS.md`, current source/tests and current explicit decisions govern implementation.
- Loyalty is now an explicitly requested local demo slice. Start with source [MVP-A](restaurant-platform-specs/06-module-loyalty-and-pos.md): authenticated staff workflow, member lookup/code, authoritative immutable ledger, reasoned manual entries, redemption and transaction history.
- Source MVP-B adds Google Wallet; MVP-C adds supported automated POS earning/redemption. The requested local demo simulates unfinished Wallet and POS behavior. Simulation must be visible; local success does not prove issuer approval, vendor acceptance, real pass delivery or restaurant readiness.
- The ledger remains authoritative during Wallet update lag/outage. Duplicate sale events must earn once, refunds append compensating entries, and redemption must not overspend. These remain implementation acceptance targets until passing tests and rehearsal are recorded.
- QR-menu subscription and CRM marketing are optional. Keep loyalty acceptance separate from marketing consent. Use only synthetic data in the local demo.
- The source archive remains unchanged. The separate loyalty implementation handoff is now integrated locally; see [the runbook](../../loyalty-demo.md) for implemented behavior, verification and remaining gaps. No external publishing or live vendor/customer action is authorized by this import.

Continue with [the current execution handoff](../../cloud-agent-handoff.md), [architecture](../../architecture.md), and the root [repository guide](../../../AGENTS.md). Current implementation evidence must be recorded separately from these historical source specifications.

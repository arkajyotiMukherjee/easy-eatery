# Easy Eatery repository guide

Node 24+ TypeScript ESM modular monolith: Fastify server, native browser UI, optional PostgreSQL, and deterministic bilingual WhatsApp pickup ordering. Read this guide and the nearest scoped AGENTS.md before changing a section. Preserve unrelated working-tree changes.

## Required context lifecycle

This repository's portable context is versioned in Git. At the start of work: inspect Git status/history and live issues/PRs; read this guide; query `graphify-out/graph.json`; read the relevant scoped AGENTS.md and ancestors; then inspect targeted source/tests. Read `docs/cloud-agent-handoff.md` for product decisions, verified state, blockers and cloud orchestration instructions. `docs/context-decisions.json` is the curated decision/blocker index, not an external acceptance ledger.

Before completing an implementation slice or handoff:

1. Update the relevant scoped guide when responsibilities/invariants change. Update the handoff/decision index for changed product decisions, external evidence, blockers or next actions. Keep GitHub issue criteria and backlog files honest and aligned.
2. Run `python3 scripts/update-context.py`. It refreshes the code/SQL graph, overlays explicit Markdown/decision context, rebuilds the report and records portable source/artifact hashes without an LLM call. Do not use a plain AST rebuild as the final step: it omits the curated overlay.
3. Run `python3 scripts/update-context.py --check` and the normal code checks appropriate to the change. Commit source, guides/decisions, `graphify-out/graph.json`, `GRAPH_REPORT.md` and `context-meta.json` together. CI rejects stale context. Refresh again after conflict resolution or later source/doc edits. A large generated graph diff is expected; do not remove the freshness check to avoid updating it.
4. Exclude tokens, cookies, private account details, customer messages, runtime data, virtual environments and graph caches. Never treat a node marked EXTRACTED/INFERRED as provider acceptance. Read its source and current tests.

Cloud agents can query the committed graph immediately after installing the pinned CLI; desktop MCP/OAuth registration is not portable. If tooling is unavailable, use the committed handoff/scoped guides for focused reads, record the limitation, and restore/rebuild context before declaring the slice complete. See `docs/graphify.md`.

## Retrieve context

Graphify is installed at `.graphify-venv/bin/graphify` (0.9.97, MCP + SQL extras). Run commands from the repository root, or use absolute graph paths from a subdirectory. Prefer a focused graph query, then verify the relevant source: AST edges show structure, not proof of runtime behavior. The graph indexes code/SQL and an explicit Markdown/decision overlay; CSS is not semantically indexed. The overlay copies source text and links, rather than inferring runtime truth. Consult the scoped guides for those.

```sh
.graphify-venv/bin/graphify query "OrderingService confirm" --budget 1500
.graphify-venv/bin/graphify explain "PostgresRepository"
.graphify-venv/bin/graphify path "Conversation" "OrderingService"
```

If the graph is absent, rebuild with `.graphify-venv/bin/graphify extract . --code-only --no-cluster --max-workers 2`. After source or context changes, run `python3 scripts/update-context.py` to preserve both code and decision layers. Do not block source verification on unavailable or incomplete graph results. The environment/caches are ignored by Git; canonical graph/report/hash metadata are committed. All graph output is excluded from Docker images.

## Section map

| Work area | Scoped guide | Start here |
| --- | --- | --- |
| Server composition / HTTP / startup | `apps/server/AGENTS.md`, `apps/server/src/AGENTS.md` | `src/app.ts`, `src/index.ts` |
| Catalog, quotes, orders, shared locale | `apps/server/src/platform/AGENTS.md` | `domain.ts`, `catalog.ts`, `ordering.ts`, `i18n.ts` |
| WhatsApp command flow | `apps/server/src/modules/whatsapp/AGENTS.md` | `conversation.ts` |
| External transport / provider contracts | `apps/server/src/integrations/AGENTS.md` | `contracts.ts`, `whatsapp.ts` |
| Durable storage and authorization | `apps/server/src/persistence/AGENTS.md` | `database.ts` |
| Dashboard / catalog browser UI | `apps/server/public/AGENTS.md` | `app.js`, `catalog-ui.js`, `i18n.js` |
| Schema changes | `migrations/AGENTS.md` | numbered SQL migrations |
| Operator CLI tools | `scripts/AGENTS.md` | `database.ts`, `import-catalog.ts` |
| Verification | `tests/AGENTS.md` | test files by behavior |
| Product / architecture / external gates | `docs/AGENTS.md` | architecture and feature docs |
| Catalog sample | `examples/AGENTS.md` | `catalog.sample.json` |
| CI / issue templates | `.github/AGENTS.md` | `workflows/ci.yml` |

## Shared constraints and checks

Keep business rules in platform services and external payloads behind integrations. Tenant and branch come from authenticated staff or mapped WhatsApp accounts. Prices are integer CLP, confirmed lines are immutable, and changed/expired quotes require confirmation again. Keep financial and fulfillment state distinct. Real WhatsApp transport exists; payment and POS adapters are demos. Local pay-at-pickup records staff actions without proving a payment-provider settlement or POS submission.

Use `npm run check` for TypeScript and browser syntax; `npm test` for memory-mode behavior. `npm run test:db` requires an explicit disposable `TEST_DATABASE_URL` and covers database behavior. Never use live customer data or credentials in fixtures, logs, guides, or graphs. Do not run migrations, seed, staff issuance, or external sends merely to inspect context.

See `docs/graphify.md` for installation, MCP registration, and graph maintenance.

# Portable agent context with Graphify

## What Git preserves

The repository commits root/scoped `AGENTS.md`, `docs/cloud-agent-handoff.md`, `docs/context-decisions.json`, the canonical `graphify-out/graph.json`, its `GRAPH_REPORT.md`, and `context-meta.json` source/artifact hashes. Together they preserve explicit product decisions, implementation navigation, blockers, evidence and work rules. They do not preserve the entire chat, browser sessions, customer records, credentials or the desktop agent's OAuth/MCP configuration.

The code/SQL layer uses Graphify AST extraction. A deterministic, project-owned overlay copies Markdown sections and curated decisions with source paths/line references and links them to named code paths/symbols. This is explicit source-backed context, not an LLM inference that a feature or provider has passed acceptance. Query results locate relevant evidence; verify the source and current tests. CSS is included in freshness hashes but has no semantic graph extraction. Some test callbacks do not produce individual AST symbols.

`graphify-out/cache`, generated HTML, manifests, temporary sidecars and `.graphify-venv` stay local/ignored. Docker excludes all graph output. Canonical files intentionally may have large diffs when code or communities change.

## Cloud bootstrap

Graphify's package is **graphifyy** (double y). Python 3.10+ and uv are required for regeneration. Install the pinned 0.9.97 CLI with MCP and SQL extras from the package registry:

```sh
uv venv .graphify-venv
uv pip install --python .graphify-venv/bin/python 'graphifyy[mcp,sql]==0.9.97'
.graphify-venv/bin/graphify query 'WhatsAppQueue delivery retries' --budget 1500
.graphify-venv/bin/graphify query 'Meta verification blocker' --budget 1500
.graphify-venv/bin/graphify explain 'PostgresRepository'
.graphify-venv/bin/graphify path 'Conversation' 'OrderingService'
```

Run from the repository root, or pass `--graph /absolute/checkout/graphify-out/graph.json`. The committed graph is already usable; do not rebuild just to ask a question. Read Git status/history and root AGENTS.md, query narrowly, read the nearest scoped guide, then inspect targeted code. If a query reports truncation, narrow it or increase the modest token budget rather than dumping the full report.

A plain clone can validate freshness without installing Graphify:

```sh
python3 scripts/update-context.py --check
```

If installation is unavailable, use the committed handoff/scoped guides and source references as a focused fallback; record that limitation. Do not skip checking actual code because an inferred edge is absent.

## Required maintenance

After changing indexed source, docs, guides or configuration:

1. Update the relevant AGENTS.md for moved responsibilities/new invariants. Record new decisions, blockers and acceptance evidence in the handoff and curated decision index. Keep GitHub/backlog status aligned; never record a credential or customer message.
2. Run `python3 scripts/update-context.py`. It rebuilds the code/SQL layer, replaces the explicit context overlay, clusters without LLM labeling, writes graph/report, then records source and artifact hashes. It makes no model API call and needs no model key. Additions, removals and deleted symbols are rebuilt from current files.
3. Run `python3 scripts/update-context.py --check`, review the generated diff, and stage canonical graph/report/hash metadata with the source/context edits. CI runs the same standard-library check and fails when a source changed without a refresh or a canonical artifact changed without updated metadata. Commit only reviewed changes.
4. After conflict resolution, repeat the refresh against the final merged source. Do not resolve a graph conflict by blindly retaining one agent's old output. A source hash is the freshness check; recorded Git revisions are provenance, not a circular requirement to regenerate after the commit itself.

The hash check validates indexed file contents and graph structural integrity; it cannot prove that prose is truthful, tests are adequate or external approvals exist. Human/agent review remains required. Do not weaken the check or exclude a touched file simply to get CI green. If upgrading Graphify, change the pin/metadata and validate the new graph behavior as a separate reviewable change.

## Optional MCP registration

This desktop previously registered an enabled stdio server named `graphify-easy-eatery`; a cloud checkout does not inherit it. Querying through CLI needs no registration. If the cloud client supports MCP, register using that checkout's absolute paths:

```sh
codex mcp add graphify-easy-eatery -- /absolute/checkout/.graphify-venv/bin/graphify-mcp --graph /absolute/checkout/graphify-out/graph.json
codex mcp get graphify-easy-eatery
```

Tools include query_graph, get_node, get_neighbors and shortest_path. Reconnect if the client caches a stale graph. MCP discovery/state is not a substitute for Git/source hash verification. The upstream `.codex/skills/graphify` installation is optional local tooling, not the authoritative project handoff; root/scoped guides and the committed context files are authoritative repository context.

Official upstream: [Graphify](https://github.com/Graphify-Labs/graphify). Revalidate installation/support details when changing the pinned tooling.

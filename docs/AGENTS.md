# Product and architecture documentation

Use `architecture.md` for runtime boundaries and deployment intent; verify implemented behavior against source. `postgres-storage.md` covers durable storage/auth and setup; `catalog-and-availability.md` covers catalog/quotes; `integrations.md` records provider evidence and external access gates. `demo-and-pilot.md` and `live-demo-onboarding.md` cover demonstrations/onboarding. `graphify.md` covers local code retrieval tooling.

`product-and-milestones.md`, `backlog.md`, `backlog.json` and `github-issues.json` track planning/issue state. When updating scope, keep corresponding human-readable and machine-readable artifacts consistent and distinguish shipped behavior from future acceptance gates. Do not treat issue snapshots as live GitHub state.

Document real WhatsApp separately from simulated payment/POS and local pay-at-pickup. Preserve account approval/merchant evidence requirements and the limitations of synchronous webhook delivery. Do not include secrets or real customer identifiers. The context refresh overlays explicit Markdown sections and curated decisions into the committed graph; source text still outranks graph navigation. Keep cloud-agent-handoff.md and context-decisions.json current, then refresh/validate canonical context before commit. Verify commands against package.json and configuration against `.env.example`.

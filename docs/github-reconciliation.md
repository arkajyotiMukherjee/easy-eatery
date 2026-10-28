# GitHub reconciliation handoff for the local Mac

## Integration update

The owner subsequently authorized direct integration through available Git. After all required local checks passed, remote main was normally fast-forwarded to `79e6483` and verified against the review branch. Do not create or merge a redundant PR for that branch; the original PR plan below is historical. The API and Mac bridge remain unavailable from the cloud task. Issue #12 is ready for implementation closure locally, while #5/#6 are already closed. See `docs/completed-issues.md`; all other issues/milestones retain their outstanding criteria.

Review date: 29 October 2026. The owner explicitly authorized updating GitHub issues, merging the required PRs and closing completed milestones. No further confirmation of those actions is required. Use the local Mac's existing GitHub CLI authentication; never copy credentials into this repository or the cloud chat.

## Current access and repository evidence

The cloud task can read public issue/milestone pages and use scoped HTTPS Git. GitHub REST/GraphQL requests return proxy Forbidden. Desktop project/task/terminal discovery repeatedly returned `connection closed before server request was answered`, including after the owner confirmed that Codex was open and connected. This is an access blocker, not an approval request. No GitHub issue, PR merge or milestone mutation was performed by this reconciliation review.

Git verified `main` at `0b4070001a734fc6cc66ba630ea78c1ce4a166ab` and the implementation branch at `abf09795e6037df68651ebf8c87f6e0c5b9353a3` before this documentation follow-up. Implementation commits are `985e7de` and `65167d5`; `abf0979` records their pushed evidence. The documentation follow-up does not change application behavior. Re-read live refs and PR state locally; do not assume that these observations remain current.

The unchanged implementation passed 28 application tests, 43 PostgreSQL TAP results, type/browser syntax, ES/EN Chromium and HTTP rehearsals, final nonroot Docker runtime and a disposable PostgreSQL backup/restore. Those are local checks, not current GitHub Actions conclusions or real provider acceptance. See `docs/issue-evidence.md` for evidence and remaining gates.

## Required PR workflow

1. Read `AGENTS.md`, query the committed graph, read the scoped guides/handoff, and preserve local changes. Use the existing local checkout; do not reset it or create a worktree merely for administration.
2. Use `gh` to find the PR from `codex/pilot-readiness` to `main`. If absent, create it with the implementation and validation summary from `docs/issue-evidence.md`. Reference partial issues without auto-closing them. Do not merge unrelated PRs merely because they are open.
3. Review the complete diff, current head/base SHAs, mergeability, review requests/discussions and required checks. Wait for the repository's POC checks, including PostgreSQL and context freshness. Do not infer CI success from the local evidence or bypass protection with admin/force options. Diagnose and fix a failing check before merging.
4. Merge only the reviewed head, using a head-match guard. Attach the created or existing PR to the local Codex task. Verify the resulting merged state and merge SHA, rather than treating an accepted merge request as proof of completion.
5. Apply the issue evidence below without overwriting unrelated body edits. Re-read each live body before checking exact criteria. Use an identifiable evidence section or comment so retries do not duplicate updates. Keep external acceptance requirements unchecked.
6. Re-evaluate completed issues and milestones from their full criteria. Update local backlog/handoff/decision evidence to the verified GitHub results, refresh context, check it, and commit/publish the follow-up through the repository workflow. Never record a pending operation as completed.

## Concrete issue updates

Post the relevant grouped implementation evidence in `docs/issue-evidence.md` to issues #10/#12, #14/#15/#17/#27, #13/#22/#23 and #18/#19/#20/#21. Link the actual merged PR and implementation commits. Distinguish local/mock tests from hosted, real-device, vendor or restaurant evidence.

These exact unchecked criteria had complete local implementation evidence at review; recheck the current code and live text before changing a checkbox:

- #8: “Persist idempotency keys and inbox/outbox events in the same transaction as order changes.” PostgreSQL rollback/replay/concurrent-confirmation tests verify this implementation. Other state/real-POS criteria remain outstanding.
- #11: “Default conversations to Spanish; support explicit English/Español commands and localized menu/cart/checkout messages without altering the order or total.” The language/cart/order tests and ES/EN rehearsals cover this. Interactive pagination, session expiry and actual WhatsApp checkout delivery are separate incomplete requirements.
- #12: customer-service-window enforcement with staff fallback, and failed/late/no-sensitive-data notification tests. Cite `whatsapp-support.integration.ts` and the missing/future/stale timestamp checks. Staff-recorded pickup payment is an audited assertion, not gateway settlement. Assess the complete human-help and notification criteria before closing the issue; do not claim real-phone delivery from fake-transport results.
- #14: server-priced immutable attempts and persisted integration/order/session references with authoritative commit/status. Expiry, abandonment, replay and gateway errors have local coverage. The required opaque checkout link is currently staff-assisted rather than automatically sent in WhatsApp; real hosted success remains unproved. Keep that delivery/acceptance requirement open.

Existing checked criteria in #7, #10 and #27 were retained. Do not uncheck verified historical behavior or check a whole bundled criterion when only one part is implemented. Production/POS reconciliation, daily reconciliation, partial refunds, restaurant approval and real staged rehearsal are not completed by this branch.

## Milestone decision

No milestone qualifies for closure on the evidence inspected:

| Milestone | Remaining completion gate |
| --- | --- |
| M0 — Pilot scope and provider access | Restaurant validation, both provider access and merchant/settlement proof |
| M1 — Modular foundation and local demo | #7 still needs actual provider mapping fixtures and restaurant approval; #8 still requires missing cancellation/POS/attention outcomes and full state acceptance |
| M2 — Real WhatsApp ordering | Approved real sender/recipient journey, actual hosted sandbox/checkout delivery and supervised HTTPS rehearsal |
| M3 — Payments and kitchen integration | Approved Toteat/Fudo adapters, real kitchen acceptance and provider reconciliation/refund/parity gates |
| M4 — Customer demo and Chile pilot readiness | Approved staging/budget, retention/legal/support ownership, restaurant feedback and go/no-go acceptance |

Local software progress does not authorize relaxing those criteria. Close a milestone only if subsequent live evidence satisfies its stated exit conditions and constituent work; zero remaining issues alone is not proof for an empty or incorrectly scoped milestone.

# GitHub delivery backlog

Both **Toteat and Fudo** are required for the initial pilot. Spanish is the default and English is also supported. Every issue includes acceptance criteria, dependencies and planning effort. Estimates exclude account approval and customer coordination; none are deadlines.

| Key | Issue | Milestone | Priority | Complexity | Effort | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| P01 | [#1: Validate the first restaurant pickup workflow](https://github.com/arkajyotiMukherjee/easy-eatery/issues/1) | M0 | P0 | S | 0.5–1 day | — |
| P02 | [#2: Prove access to both Toteat and Fudo for the initial pilot](https://github.com/arkajyotiMukherjee/easy-eatery/issues/2) | M0 | P0 | M | 1–2 days + provider wait | #1 |
| P03 | [#3: Prove hosted payment-link capability and merchant settlement](https://github.com/arkajyotiMukherjee/easy-eatery/issues/3) | M0 | P0 | M | 1–2 days + provider wait | #1, #2 |
| P04 | [#4: Review the Spanish customer flow and pickup dashboard with the restaurant](https://github.com/arkajyotiMukherjee/easy-eatery/issues/4) | M0 | P0 | S | 0.5–1 day | #1 |
| P05 | [#5: Establish the TypeScript modular monolith and repeatable local demo](https://github.com/arkajyotiMukherjee/easy-eatery/issues/5) | M1 | P0 | M | 1–2 days | — |
| P06 | [#6: Replace demo storage with PostgreSQL and enforce restaurant access](https://github.com/arkajyotiMukherjee/easy-eatery/issues/6) | M1 | P0 | M | 2–3 days | #5 |
| P07 | [#7: Import the pilot catalog and enforce service availability](https://github.com/arkajyotiMukherjee/easy-eatery/issues/7) | M1 | P0 | M | 1–2 days | #2, #6 |
| P08 | [#8: Implement durable order states, quotes and transactional events](https://github.com/arkajyotiMukherjee/easy-eatery/issues/8) | M1 | P0 | M | 2 days | #6, #7 |
| P09 | [#9: Connect the Meta WhatsApp Cloud API test account](https://github.com/arkajyotiMukherjee/easy-eatery/issues/9) | M2 | P0 | S | 0.5–1 day + account wait | #2, #5 |
| P10 | [#10: Make signed WhatsApp webhooks durable and retryable](https://github.com/arkajyotiMukherjee/easy-eatery/issues/10) | M2 | P0 | M | 2–3 days | #6, #8, #9 |
| P11 | [#11: Build the Spanish WhatsApp menu, cart and confirmation journey](https://github.com/arkajyotiMukherjee/easy-eatery/issues/11) | M2 | P0 | M | 2–3 days | #7, #8, #10 |
| P12 | [#12: Add staff handoff and permitted pickup notifications](https://github.com/arkajyotiMukherjee/easy-eatery/issues/12) | M2 | P1 | M | 1–2 days | #10, #11 |
| P13 | [#13: Implement the Toteat catalog and paid-pickup adapter](https://github.com/arkajyotiMukherjee/easy-eatery/issues/13) | M3 | P0 | M | 2–3 days | #2, #7, #8 |
| P14 | [#14: Implement the approved hosted checkout adapter](https://github.com/arkajyotiMukherjee/easy-eatery/issues/14) | M3 | P0 | M | 2 days | #3, #8 |
| P15 | [#15: Reconcile verified payments and submit paid orders once](https://github.com/arkajyotiMukherjee/easy-eatery/issues/15) | M3 | P0 | L | 2–3 days | #10, #13, #14, #22 |
| P16 | [#16: Reconcile POS submission retries and kitchen status updates](https://github.com/arkajyotiMukherjee/easy-eatery/issues/16) | M3 | P0 | L | 2–3 days | #13, #15, #22 |
| P17 | [#17: Implement cancellation, refund and reconciliation exceptions](https://github.com/arkajyotiMukherjee/easy-eatery/issues/17) | M3 | P0 | M | 1–2 days | #15, #16 |
| P22 | [#22: Implement the approved Fudo external-order and catalog adapter](https://github.com/arkajyotiMukherjee/easy-eatery/issues/22) | M3 | P0 | L | 2–4 days + approval wait | #2, #7, #8 |
| P23 | [#23: Verify restaurant provider selection and Toteat/Fudo acceptance parity](https://github.com/arkajyotiMukherjee/easy-eatery/issues/23) | M3 | P0 | M | 1–2 days | #13, #22, #15, #16 |
| P18 | [#18: Deliver the authenticated restaurant pickup logistics dashboard](https://github.com/arkajyotiMukherjee/easy-eatery/issues/18) | M4 | P0 | M | 2–3 days | #6, #8, #16, #17 |
| P19 | [#19: Deploy isolated Santiago staging with database and secret management](https://github.com/arkajyotiMukherjee/easy-eatery/issues/19) | M4 | P0 | M | 1–2 days | #6, #10 |
| P20 | [#20: Prepare pilot privacy, support and operational controls](https://github.com/arkajyotiMukherjee/easy-eatery/issues/20) | M4 | P0 | M | 1–2 days | #1, #10, #17, #19 |
| P21 | [#21: Run customer demo, sandbox acceptance and the Chile pilot go/no-go](https://github.com/arkajyotiMukherjee/easy-eatery/issues/21) | M4 | P0 | M | 1–2 days + pilot observation | #4, #11, #12, #17, #18, #19, #20, #23 |

Foundation issue #5 is complete and closed by merged PR #24. Issue #6 is implemented on `codex/postgres-restaurant-access` and awaits review/merge. The remaining issues are planned work; creating an issue does not mark the integration complete. M0 and provider-access tasks should begin immediately, including Fudo's external-order approval request through the authorized restaurant owner.

Machine-readable planning data: `backlog.json`. Actual created GitHub issue IDs/URLs: `github-issues.json`. When changing scope, update both GitHub issue bodies and these local indexes. Do not blindly re-run a creation script and duplicate issues.


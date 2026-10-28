# Durable WhatsApp exception recovery

This developer-assisted recovery API is available in PostgreSQL mode after applying migration 005. It does not provide a staff dashboard, provider delivery-status reconciliation or ready notifications. The normal worker must run to process any work released by recovery. Use an individual scoped owner/operator token; a viewer can inspect the redacted list but cannot mutate jobs. Tokens and active membership are checked again inside each transaction.

## Inspect and choose the safe action

`GET /api/whatsapp/delivery/jobs` returns the oldest 100 `failed` or `needs_attention` jobs for the authenticated branch. It includes job ID, state, recovery version, attempt count, bounded error code and timestamps. Sender addresses, phone/account identifiers, inbound text, reply text and provider IDs are excluded. Resolve older exceptions before requesting the list again when more than 100 need attention.

The list is a queue diagnostic, not proof of provider or device delivery. Investigate the operational cause using authorized provider tools and an appropriate private support process. Do not put customer conversations or credentials into issues, logs or this repository. This API deliberately cannot blindly resend an ambiguous job.

| Job state | Operation | Meaning |
| --- | --- | --- |
| `failed` | `POST /api/whatsapp/delivery/jobs/:id/retry` with `{"expectedState":"failed","expectedVersion":0}` | After correcting a known processing failure or explicit provider rejection, permit a fresh bounded retry sequence. A committed reply is reused; otherwise processing resumes. |
| `needs_attention` | `POST /api/whatsapp/delivery/jobs/:id/resolve` with `{"expectedState":"needs_attention","expectedVersion":0,"confirmation":"reviewed_without_resend"}` | Staff explicitly completes review without resending the uncertain reply. The job becomes `resolved` and later messages in that conversation can proceed. |

Use the current `version` returned by the exception list as `expectedVersion`; the examples use version 0 only for an initial failure. Each recovery action increments the version. If another retry fails later, an old request cannot reopen it: staff must review the new failure and submit its new version.

A resolved job is not marked `sent`; the response contains `deliveryConfirmed: false` and `resent: false`. It creates no delivery receipt, payment change or kitchen transition. The original ambiguous attempt can still have reached the recipient. Review the conversation before releasing subsequent work; the operator may need to handle customer follow-up separately through an authorized channel.

Retrying an uncertain job or resolving a known failure returns HTTP 409. A stale/replayed request, a job from another branch or a nonexistent ID also returns 409 without revealing which case applies. Concurrent processes serialize recovery through the existing branch lock; only one recovery transition commits. Each successful action records the staff actor and job ID in `audit_events`; rollback also rolls back that audit record. Viewer mutation returns 403, invalid/expired/revoked credentials return 401, and malformed confirmation returns 400.

## Evidence and limits

The dedicated `tests/whatsapp-recovery.integration.ts` suite uses fake transports and an explicit disposable `TEST_DATABASE_URL`. It exercises redacted scope, viewer/revoked-token rejection, cross-tenant access, concurrent recovery, stale replay, retry of processing failures versus committed replies, continued conversation sequencing and the absence of a false delivery/payment success claim. Its passing results establish local PostgreSQL behavior only. Real recipient eligibility, provider status evidence and a real-phone ordering rehearsal remain separate gates.

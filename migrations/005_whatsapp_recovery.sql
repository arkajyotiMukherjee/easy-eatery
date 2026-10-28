-- Staff review is terminal for queue ordering, but is not a delivery receipt.
ALTER TABLE whatsapp_jobs DROP CONSTRAINT whatsapp_jobs_state_check;
ALTER TABLE whatsapp_jobs ADD CONSTRAINT whatsapp_jobs_state_check
  CHECK (state IN ('pending','reply_pending','sending','sent','failed','needs_attention','resolved'));

-- Optimistic generation prevents an old review from reopening a later failure.
ALTER TABLE whatsapp_jobs ADD COLUMN recovery_version integer NOT NULL DEFAULT 0 CHECK (recovery_version >= 0);

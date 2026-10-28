CREATE TABLE whatsapp_jobs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  phone_id text NOT NULL,
  message_id text NOT NULL CHECK (length(message_id) BETWEEN 1 AND 512),
  sender text NOT NULL CHECK (length(sender) BETWEEN 1 AND 64),
  message_text text NOT NULL CHECK (length(message_text) <= 1000),
  response text,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','reply_pending','sending','sent','failed','needs_attention')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  claim_id uuid,
  error_code text,
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(tenant_id,branch_id,phone_id,message_id),
  FOREIGN KEY(tenant_id,branch_id) REFERENCES branches(tenant_id,id)
);
CREATE INDEX whatsapp_jobs_work ON whatsapp_jobs(state,available_at,id);
CREATE INDEX whatsapp_jobs_conversation ON whatsapp_jobs(tenant_id,branch_id,phone_id,sender,id);

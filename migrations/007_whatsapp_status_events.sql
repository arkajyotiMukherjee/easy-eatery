-- Provider status evidence is separate from queue send/recovery state.
-- Status events may arrive before the outbound receipt transaction commits.
CREATE TABLE whatsapp_status_events (
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  phone_id text NOT NULL,
  provider_message_id text NOT NULL CHECK (length(provider_message_id) BETWEEN 1 AND 512),
  status text NOT NULL CHECK (status IN ('sent','delivered','read','failed')),
  provider_timestamp bigint NOT NULL CHECK (provider_timestamp BETWEEN 0 AND 9999999999),
  error_code integer CHECK (error_code >= 0),
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,branch_id,phone_id,provider_message_id,status,provider_timestamp),
  FOREIGN KEY(tenant_id,branch_id) REFERENCES branches(tenant_id,id)
);
CREATE INDEX whatsapp_status_retention ON whatsapp_status_events(received_at);

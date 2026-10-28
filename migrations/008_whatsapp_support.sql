-- Provider timestamp comes only from a verified, mapped inbound payload. Local
-- receipt time never opens a customer-service window for a replayed message.
ALTER TABLE whatsapp_jobs ADD COLUMN provider_timestamp timestamptz;

CREATE TABLE whatsapp_order_contacts (
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  order_id uuid NOT NULL,
  phone_id text NOT NULL,
  recipient text NOT NULL CHECK (length(recipient) BETWEEN 1 AND 64),
  PRIMARY KEY(tenant_id,branch_id,order_id),
  FOREIGN KEY(tenant_id,branch_id,order_id) REFERENCES orders(tenant_id,branch_id,id) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE whatsapp_handoffs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  phone_id text NOT NULL,
  message_id text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('help','allergy','payment_exception','unknown_request')),
  state text NOT NULL DEFAULT 'open' CHECK (state IN ('open','reviewed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(tenant_id,branch_id,phone_id,message_id),
  FOREIGN KEY(tenant_id,branch_id) REFERENCES branches(tenant_id,id)
);

CREATE TABLE whatsapp_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  phone_id text NOT NULL,
  order_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('accepted','ready','store_payment_recorded')),
  recipient text NOT NULL CHECK (length(recipient) BETWEEN 1 AND 64),
  locale text NOT NULL CHECK (locale IN ('es','en')),
  message_text text NOT NULL CHECK (length(message_text) <= 1000),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sending','sent','failed','needs_attention','staff_required','superseded')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  claim_id uuid,
  error_code text,
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(tenant_id,branch_id,phone_id,order_id,kind),
  FOREIGN KEY(tenant_id,branch_id,order_id) REFERENCES orders(tenant_id,branch_id,id)
);
CREATE INDEX whatsapp_notifications_work ON whatsapp_notifications(state,available_at,id);

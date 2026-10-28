CREATE TABLE tenants (
  id text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE branches (
  tenant_id text NOT NULL REFERENCES tenants(id),
  id text NOT NULL,
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Santiago',
  pos_provider text NOT NULL CHECK (pos_provider IN ('toteat', 'fudo')),
  modules jsonb NOT NULL DEFAULT '{"whatsappOrdering":true,"qrMenu":false}',
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE staff_users (
  id uuid PRIMARY KEY,
  display_name text NOT NULL
);
CREATE TABLE memberships (
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES staff_users(id),
  role text NOT NULL CHECK (role IN ('owner', 'operator', 'viewer')),
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (tenant_id, branch_id, user_id),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id)
);
CREATE TABLE access_tokens (
  id uuid PRIMARY KEY,
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  FOREIGN KEY (tenant_id, branch_id, user_id) REFERENCES memberships(tenant_id, branch_id, user_id)
);

CREATE TABLE channel_accounts (
  provider text NOT NULL CHECK (provider = 'whatsapp'),
  external_account_id text NOT NULL,
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  PRIMARY KEY (provider, external_account_id),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id)
);

CREATE TABLE products (
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  id text NOT NULL,
  name text NOT NULL,
  name_en text NOT NULL,
  price integer NOT NULL CHECK (price >= 0),
  available boolean NOT NULL,
  PRIMARY KEY (tenant_id, branch_id, id),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id)
);

CREATE TABLE orders (
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  id uuid NOT NULL,
  customer_id text NOT NULL,
  source text NOT NULL CHECK (source = 'whatsapp'),
  currency text NOT NULL CHECK (currency = 'CLP'),
  total integer NOT NULL CHECK (total >= 0),
  status text NOT NULL CHECK (status IN ('awaiting_payment', 'paid', 'preparing', 'ready', 'collected')),
  pos_provider text NOT NULL CHECK (pos_provider IN ('toteat', 'fudo')),
  payment_reference text,
  pos_reference text,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, branch_id, id),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id),
  UNIQUE (tenant_id, branch_id, payment_reference),
  UNIQUE (tenant_id, branch_id, pos_provider, pos_reference)
);
CREATE TABLE order_lines (
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  order_id uuid NOT NULL,
  line_number integer NOT NULL CHECK (line_number >= 0),
  product_id text NOT NULL,
  name text NOT NULL,
  name_en text NOT NULL,
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  PRIMARY KEY (tenant_id, branch_id, order_id, line_number),
  FOREIGN KEY (tenant_id, branch_id, order_id) REFERENCES orders(tenant_id, branch_id, id),
  FOREIGN KEY (tenant_id, branch_id, product_id) REFERENCES products(tenant_id, branch_id, id)
);
CREATE TABLE conversations (
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  customer_id text NOT NULL,
  locale text NOT NULL CHECK (locale IN ('es', 'en')),
  cart jsonb NOT NULL DEFAULT '[]',
  order_id uuid,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, branch_id, customer_id),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id),
  FOREIGN KEY (tenant_id, branch_id, order_id) REFERENCES orders(tenant_id, branch_id, id)
);
CREATE TABLE payment_attempts (
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  reference text NOT NULL,
  order_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider = 'simulation'),
  amount integer NOT NULL CHECK (amount >= 0),
  currency text NOT NULL CHECK (currency = 'CLP'),
  status text NOT NULL CHECK (status IN ('pending', 'simulated_paid')),
  PRIMARY KEY (tenant_id, branch_id, reference),
  FOREIGN KEY (tenant_id, branch_id, order_id) REFERENCES orders(tenant_id, branch_id, id)
);
CREATE TABLE inbox (
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  event_key text NOT NULL,
  response text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, branch_id, event_key),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id)
);
CREATE TABLE outbox (
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  event_key text NOT NULL,
  event_type text NOT NULL,
  order_id uuid NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  PRIMARY KEY (tenant_id, branch_id, event_key),
  FOREIGN KEY (tenant_id, branch_id, order_id) REFERENCES orders(tenant_id, branch_id, id)
);
CREATE TABLE whatsapp_deliveries (
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  event_key text NOT NULL,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, branch_id, event_key),
  FOREIGN KEY (tenant_id, branch_id, event_key) REFERENCES inbox(tenant_id, branch_id, event_key)
);
CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  branch_id text NOT NULL,
  actor_id text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id)
);

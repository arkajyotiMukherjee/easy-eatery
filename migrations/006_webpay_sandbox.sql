ALTER TABLE branches ADD COLUMN sandbox_checkout boolean NOT NULL DEFAULT false;
ALTER TABLE branches ADD CONSTRAINT branch_checkout_exclusive CHECK (NOT (sandbox_checkout AND pay_at_pickup));
ALTER TABLE orders DROP CONSTRAINT orders_payment_method_check;
ALTER TABLE orders DROP CONSTRAINT orders_payment_state_check;
ALTER TABLE orders DROP CONSTRAINT order_payment_consistency;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('simulation','pay_at_pickup','webpay_sandbox'));
ALTER TABLE orders ADD CONSTRAINT orders_payment_state_check CHECK (payment_state IN ('due','simulated_paid','store_paid','sandbox_authorized','sandbox_reversed','sandbox_review'));
ALTER TABLE orders ADD CONSTRAINT order_payment_consistency CHECK (
 (payment_method='simulation' AND fulfillment='simulation' AND payment_state IN ('due','simulated_paid')) OR
 (payment_method='pay_at_pickup' AND fulfillment='local' AND payment_state IN ('due','store_paid') AND payment_reference IS NULL AND pos_reference IS NULL) OR
 (payment_method='webpay_sandbox' AND fulfillment='local' AND payment_state IN ('due','sandbox_authorized','sandbox_reversed','sandbox_review') AND pos_reference IS NULL)
);

CREATE TABLE sandbox_attempts (
 id uuid PRIMARY KEY,
 tenant_id text NOT NULL,
 branch_id text NOT NULL,
 order_id uuid NOT NULL,
 environment text NOT NULL DEFAULT 'integration' CHECK (environment='integration'),
 commerce_code text NOT NULL,
 buy_order text NOT NULL CHECK (length(buy_order) BETWEEN 1 AND 26),
 session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 61),
 amount integer NOT NULL CHECK (amount > 0),
 currency text NOT NULL CHECK (currency='CLP'),
 state text NOT NULL CHECK (state IN ('creating','ready','committing','needs_attention','authorized','declined','reversed')),
 provider_token text CHECK (length(provider_token) BETWEEN 1 AND 64),
 token_hash text UNIQUE,
 link_hash text UNIQUE,
 expires_at timestamptz NOT NULL,
 claim_id uuid,
 claim_until timestamptz,
 commit_started boolean NOT NULL DEFAULT false,
 refund_started boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (tenant_id,branch_id,order_id),
 UNIQUE (commerce_code,buy_order),
 FOREIGN KEY (tenant_id,branch_id,order_id) REFERENCES orders(tenant_id,branch_id,id)
);

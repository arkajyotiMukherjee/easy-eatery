ALTER TABLE branches
  ADD COLUMN catalog_version integer NOT NULL DEFAULT 1 CHECK (catalog_version > 0),
  ADD COLUMN catalog_source text NOT NULL DEFAULT 'seed' CHECK (catalog_source IN ('seed','manual')),
  ADD COLUMN catalog_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN service_availability jsonb NOT NULL DEFAULT '{"acceptingOrders":true,"shiftOpen":true,"hours":[],"maxAgeMinutes":1440}';
ALTER TABLE products
  ADD COLUMN provider_mappings jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN modifiers jsonb NOT NULL DEFAULT '[]';
ALTER TABLE conversations ADD COLUMN quote jsonb;
ALTER TABLE orders ADD COLUMN catalog_version integer;
ALTER TABLE order_lines ADD COLUMN selection jsonb NOT NULL DEFAULT '{}';

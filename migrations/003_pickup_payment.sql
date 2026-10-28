ALTER TABLE branches ADD COLUMN pay_at_pickup boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN payment_method text NOT NULL DEFAULT 'simulation' CHECK (payment_method IN ('simulation','pay_at_pickup'));
ALTER TABLE orders ADD COLUMN payment_state text NOT NULL DEFAULT 'due' CHECK (payment_state IN ('due','simulated_paid','store_paid'));
ALTER TABLE orders ADD COLUMN fulfillment text NOT NULL DEFAULT 'simulation' CHECK (fulfillment IN ('simulation','local'));
UPDATE orders SET payment_state='simulated_paid' WHERE status <> 'awaiting_payment';
ALTER TABLE orders ADD CONSTRAINT order_payment_consistency CHECK (
 (payment_method='simulation' AND fulfillment='simulation' AND payment_state IN ('due','simulated_paid')) OR
 (payment_method='pay_at_pickup' AND fulfillment='local' AND payment_state IN ('due','store_paid') AND payment_reference IS NULL AND pos_reference IS NULL)
);

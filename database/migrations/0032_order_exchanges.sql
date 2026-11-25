ALTER TABLE orders ADD COLUMN exchange_units INTEGER NOT NULL DEFAULT 0
 CHECK(typeof(exchange_units)='integer' AND exchange_units>=0);
ALTER TABLE orders ADD COLUMN exchange_discount_cents INTEGER NOT NULL DEFAULT 0
 CHECK(typeof(exchange_discount_cents)='integer' AND exchange_discount_cents>=0);

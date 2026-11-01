-- Novos eventos e índices; preservar extratos existentes ao retirar unicidade histórica do período.
PRAGMA defer_foreign_keys=ON;
CREATE TABLE closings_r2 (
 id TEXT NOT NULL,organization_id TEXT NOT NULL,customer_id TEXT NOT NULL,
 period_start TEXT NOT NULL,period_end TEXT NOT NULL,due_on TEXT NOT NULL,
 terms TEXT NOT NULL CHECK(json_valid(terms)),total_cents INTEGER NOT NULL CHECK(total_cents>=0),
 user_id TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','annulled')),active_key TEXT,
 PRIMARY KEY(organization_id,id),UNIQUE(organization_id,customer_id,active_key),
 FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
INSERT INTO closings_r2(id,organization_id,customer_id,period_start,period_end,due_on,terms,total_cents,user_id,created_at,active_key)
 SELECT id,organization_id,customer_id,period_start,period_end,due_on,terms,total_cents,user_id,created_at,period_start||':'||period_end||':'||terms FROM closings;
DROP TABLE closings;
ALTER TABLE closings_r2 RENAME TO closings;
CREATE TABLE closing_order_history (
 organization_id TEXT NOT NULL,closing_id TEXT NOT NULL,order_id TEXT NOT NULL,total_cents INTEGER NOT NULL,
 PRIMARY KEY(organization_id,closing_id,order_id),
 FOREIGN KEY(organization_id,closing_id) REFERENCES closings(organization_id,id),
 FOREIGN KEY(organization_id,order_id) REFERENCES orders(organization_id,id)
);
INSERT INTO closing_order_history SELECT organization_id,closing_id,order_id,total_cents FROM closing_orders;
CREATE TABLE closing_annulments (
 id TEXT NOT NULL,organization_id TEXT NOT NULL,closing_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),
 reason TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(organization_id,id),UNIQUE(organization_id,closing_id),
 FOREIGN KEY(organization_id,closing_id) REFERENCES closings(organization_id,id)
);
CREATE TABLE customer_credits (
 organization_id TEXT NOT NULL,event_id TEXT NOT NULL,customer_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,event_id),FOREIGN KEY(organization_id,event_id) REFERENCES payment_events(organization_id,id),
 FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
CREATE TABLE credit_refunds (
 organization_id TEXT NOT NULL,credit_event_id TEXT NOT NULL,refund_event_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,refund_event_id),
 FOREIGN KEY(organization_id,credit_event_id) REFERENCES customer_credits(organization_id,event_id),
 FOREIGN KEY(organization_id,refund_event_id) REFERENCES payment_events(organization_id,id)
);
CREATE TABLE credit_allocation_events (
 id TEXT NOT NULL,organization_id TEXT NOT NULL,customer_id TEXT NOT NULL,credit_event_id TEXT NOT NULL,order_id TEXT NOT NULL,
 amount_cents INTEGER NOT NULL CHECK(amount_cents<>0),reason TEXT NOT NULL DEFAULT '',user_id TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(organization_id,id),FOREIGN KEY(organization_id,credit_event_id) REFERENCES customer_credits(organization_id,event_id),
 FOREIGN KEY(organization_id,order_id) REFERENCES orders(organization_id,id)
);
CREATE TABLE combined_receipts (
 id TEXT NOT NULL,organization_id TEXT NOT NULL,customer_id TEXT NOT NULL,order_id TEXT NOT NULL,
 payment_event_id TEXT NOT NULL,status_event_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),
 order_version INTEGER NOT NULL,created_at INTEGER NOT NULL DEFAULT(unixepoch()),undo_id TEXT,
 PRIMARY KEY(organization_id,id),FOREIGN KEY(organization_id,order_id) REFERENCES orders(organization_id,id),
 FOREIGN KEY(organization_id,payment_event_id) REFERENCES payment_events(organization_id,id),
 FOREIGN KEY(status_event_id) REFERENCES order_status_events(id)
);
ALTER TABLE customer_profiles ADD COLUMN payment_mode TEXT GENERATED ALWAYS AS(json_extract(data,'$.terms.mode')) VIRTUAL;
ALTER TABLE customer_profiles ADD COLUMN closing_cycle TEXT GENERATED ALWAYS AS(json_extract(data,'$.terms.cycle')) VIRTUAL;
ALTER TABLE order_terms ADD COLUMN payment_mode TEXT GENERATED ALWAYS AS(json_extract(data,'$.mode')) VIRTUAL;
ALTER TABLE order_terms ADD COLUMN closing_cycle TEXT GENERATED ALWAYS AS(json_extract(data,'$.cycle')) VIRTUAL;
CREATE INDEX profiles_condition ON customer_profiles(organization_id,payment_mode,closing_cycle);
CREATE INDEX terms_condition ON order_terms(organization_id,payment_mode,closing_cycle);
CREATE INDEX credit_account ON customer_credits(organization_id,customer_id);
PRAGMA defer_foreign_keys=OFF;

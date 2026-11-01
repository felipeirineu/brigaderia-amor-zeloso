-- Estruturas aditivas; sem seeds, recebimentos ou condições inventadas para legado.
CREATE TABLE customer_profiles (
 organization_id TEXT NOT NULL, customer_id TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)),
 version INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(organization_id,customer_id),
 FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
CREATE TABLE order_terms (
 organization_id TEXT NOT NULL, order_id TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)),
 version INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(organization_id,order_id),
 FOREIGN KEY(organization_id,order_id) REFERENCES orders(organization_id,id)
);
CREATE TABLE finance_accounts (
 organization_id TEXT NOT NULL, customer_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 mutation_id TEXT NOT NULL DEFAULT '', PRIMARY KEY(organization_id,customer_id),
 FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
CREATE TABLE finance_requests (
 organization_id TEXT NOT NULL, request_key TEXT NOT NULL, request_hash TEXT NOT NULL,
 response TEXT NOT NULL CHECK(json_valid(response)), PRIMARY KEY(organization_id,request_key),
 FOREIGN KEY(organization_id) REFERENCES organizations(id)
);
CREATE TABLE payment_events (
 id TEXT NOT NULL, organization_id TEXT NOT NULL, customer_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
 kind TEXT NOT NULL CHECK(kind IN ('payment','deposit','reversal')), amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
 method TEXT NOT NULL CHECK(method IN ('pix','cash','debit','credit','transfer','other')),
 paid_on TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', reversal_of TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(organization_id,id), UNIQUE(organization_id,reversal_of),
 FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id),
 FOREIGN KEY(organization_id,reversal_of) REFERENCES payment_events(organization_id,id)
);
CREATE TABLE payment_allocations (
 organization_id TEXT NOT NULL, event_id TEXT NOT NULL, order_id TEXT NOT NULL,
 amount_cents INTEGER NOT NULL CHECK(amount_cents>0), PRIMARY KEY(organization_id,event_id,order_id),
 FOREIGN KEY(organization_id,event_id) REFERENCES payment_events(organization_id,id),
 FOREIGN KEY(organization_id,order_id) REFERENCES orders(organization_id,id)
);
CREATE INDEX payments_customer ON payment_events(organization_id,customer_id,paid_on);
CREATE INDEX allocations_order ON payment_allocations(organization_id,order_id);
CREATE TABLE closings (
 id TEXT NOT NULL, organization_id TEXT NOT NULL, customer_id TEXT NOT NULL,
 period_start TEXT NOT NULL, period_end TEXT NOT NULL, due_on TEXT NOT NULL,
 terms TEXT NOT NULL CHECK(json_valid(terms)), total_cents INTEGER NOT NULL CHECK(total_cents>=0),
 user_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(organization_id,id), UNIQUE(organization_id,customer_id,period_start,period_end,terms),
 FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
CREATE TABLE closing_orders (
 organization_id TEXT NOT NULL, closing_id TEXT NOT NULL, order_id TEXT NOT NULL,
 total_cents INTEGER NOT NULL CHECK(total_cents>=0), PRIMARY KEY(organization_id,order_id),
 FOREIGN KEY(organization_id,closing_id) REFERENCES closings(organization_id,id),
 FOREIGN KEY(organization_id,order_id) REFERENCES orders(organization_id,id)
);
CREATE TABLE payment_settings (
 organization_id TEXT PRIMARY KEY NOT NULL REFERENCES organizations(id), data TEXT NOT NULL CHECK(json_valid(data)),
 version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE inventory_balances (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,balance_milli INTEGER NOT NULL DEFAULT 0 CHECK(balance_milli>=0 AND balance_milli<=1000000000000),
 minimum_milli INTEGER CHECK(minimum_milli>=0 AND minimum_milli<=1000000000000),version INTEGER NOT NULL DEFAULT 1,mutation_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,id),FOREIGN KEY(organization_id,id) REFERENCES supplies(organization_id,id)
);
CREATE TABLE inventory_events (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,supply_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),
 kind TEXT NOT NULL CHECK(kind IN('entry','consumption','loss','adjustment','reversal')),delta_milli INTEGER NOT NULL CHECK(delta_milli<>0),
 reason TEXT NOT NULL,lot TEXT NOT NULL DEFAULT '',expires_on TEXT,order_id TEXT,reversal_of TEXT,
 created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(organization_id,id),UNIQUE(organization_id,reversal_of),
 FOREIGN KEY(organization_id,supply_id) REFERENCES supplies(organization_id,id),
 FOREIGN KEY(organization_id,order_id) REFERENCES orders(organization_id,id),
 FOREIGN KEY(organization_id,reversal_of) REFERENCES inventory_events(organization_id,id)
);
CREATE INDEX inventory_supply ON inventory_events(organization_id,supply_id,created_at);

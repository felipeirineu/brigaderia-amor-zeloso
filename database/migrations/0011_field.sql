CREATE TABLE customer_sites (
 organization_id TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)),
 version INTEGER NOT NULL DEFAULT 1, mutation_id TEXT NOT NULL, photo BLOB,
 PRIMARY KEY(organization_id,id),FOREIGN KEY(organization_id,id) REFERENCES customers(organization_id,id),
 CHECK(photo IS NULL OR length(photo)<=40960)
);
CREATE TABLE company_places (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL CHECK(json_valid(data)),
 version INTEGER NOT NULL DEFAULT 1,mutation_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,id),FOREIGN KEY(organization_id) REFERENCES organizations(id)
);
CREATE TABLE display_profiles (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,display_name TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,mutation_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,id),FOREIGN KEY(organization_id,id) REFERENCES memberships(organization_id,user_id)
);
CREATE TABLE place_cache (organization_id TEXT NOT NULL,query_hash TEXT NOT NULL,data TEXT NOT NULL,expires_at INTEGER NOT NULL,PRIMARY KEY(organization_id,query_hash));
CREATE TABLE provider_limits (id TEXT PRIMARY KEY,next_at INTEGER NOT NULL);
INSERT INTO provider_limits(id,next_at) VALUES('photon',0);
CREATE TABLE displacements (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),
 mode TEXT NOT NULL CHECK(mode IN('uber','99','courier','car','walk','other')),leg TEXT NOT NULL CHECK(leg IN('outbound','return','roundtrip')),
 occurred_at TEXT NOT NULL,amount_cents INTEGER NOT NULL CHECK(amount_cents>=0 AND amount_cents<=1000000000),
 performer_id TEXT REFERENCES users(id),courier_name TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',
 expense_id TEXT,reason TEXT NOT NULL DEFAULT '',reversal_of TEXT,
 mutation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(organization_id,id),UNIQUE(organization_id,reversal_of),
 FOREIGN KEY(organization_id,expense_id) REFERENCES expense_events(organization_id,id),
 FOREIGN KEY(organization_id,reversal_of) REFERENCES displacements(organization_id,id)
);
CREATE TABLE displacement_orders (
 organization_id TEXT NOT NULL,displacement_id TEXT NOT NULL,order_id TEXT NOT NULL,allocated_cents INTEGER NOT NULL CHECK(allocated_cents>=0),
 PRIMARY KEY(organization_id,displacement_id,order_id),
 FOREIGN KEY(organization_id,displacement_id) REFERENCES displacements(organization_id,id),
 FOREIGN KEY(organization_id,order_id) REFERENCES orders(organization_id,id)
);
CREATE INDEX displacement_date ON displacements(organization_id,occurred_at);
CREATE TABLE order_places (
 organization_id TEXT NOT NULL,order_id TEXT NOT NULL,data TEXT NOT NULL CHECK(json_valid(data)),
 PRIMARY KEY(organization_id,order_id),FOREIGN KEY(organization_id,order_id) REFERENCES orders(organization_id,id)
);

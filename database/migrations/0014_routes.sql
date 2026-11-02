-- Metadados derivados privados; nenhuma despesa/cliente/pedido é criado.
CREATE TABLE route_cache (
 organization_id TEXT NOT NULL REFERENCES organizations(id), fingerprint TEXT NOT NULL,
 provider TEXT NOT NULL CHECK(length(provider) BETWEEN 1 AND 40), route_km REAL NOT NULL CHECK(route_km>=0), route_minutes REAL NOT NULL CHECK(route_minutes>=0),
 route_computed_at TEXT NOT NULL, PRIMARY KEY(organization_id,fingerprint)
);
CREATE TABLE route_jobs (
 organization_id TEXT NOT NULL,customer_id TEXT NOT NULL,fingerprint TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN('pending','working','ready','failed')),force INTEGER NOT NULL DEFAULT 0 CHECK(force IN(0,1)),
 request_key TEXT NOT NULL DEFAULT '',lease_until INTEGER NOT NULL DEFAULT 0,retry_at INTEGER NOT NULL DEFAULT 0,nonce TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(organization_id,customer_id),FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
CREATE TABLE route_budget (id TEXT PRIMARY KEY,window_start INTEGER NOT NULL,used INTEGER NOT NULL,next_at INTEGER NOT NULL);
INSERT INTO route_budget(id,window_start,used,next_at) VALUES('ors',0,0,0);

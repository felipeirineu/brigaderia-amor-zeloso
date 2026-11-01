CREATE TABLE customer_imports (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),request_key TEXT NOT NULL,request_hash TEXT NOT NULL,mutation_id TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(organization_id,id),UNIQUE(organization_id,request_key),FOREIGN KEY(organization_id) REFERENCES organizations(id)
);

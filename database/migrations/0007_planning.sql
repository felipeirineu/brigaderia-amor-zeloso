CREATE TABLE p1_requests (
 organization_id TEXT NOT NULL,request_key TEXT NOT NULL,request_hash TEXT NOT NULL,response TEXT NOT NULL CHECK(json_valid(response)),
 PRIMARY KEY(organization_id,request_key),FOREIGN KEY(organization_id) REFERENCES organizations(id)
);
CREATE TABLE reminders (
 id TEXT NOT NULL,organization_id TEXT NOT NULL,title TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '',due_at TEXT NOT NULL,
 customer_id TEXT,done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0,1)),active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 version INTEGER NOT NULL DEFAULT 1,mutation_id TEXT NOT NULL DEFAULT '',user_id TEXT NOT NULL REFERENCES users(id),
 PRIMARY KEY(organization_id,id),FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
CREATE INDEX reminders_due ON reminders(organization_id,active,done,due_at);

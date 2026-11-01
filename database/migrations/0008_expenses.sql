CREATE TABLE expense_events (
 id TEXT NOT NULL,organization_id TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('expense','reversal')),
 amount_cents INTEGER NOT NULL CHECK(amount_cents>0),category TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',
 method TEXT NOT NULL CHECK(method IN ('pix','cash','debit','credit','transfer','other')),spent_on TEXT NOT NULL,
 order_id TEXT,user_id TEXT NOT NULL REFERENCES users(id),reason TEXT NOT NULL DEFAULT '',reversal_of TEXT,
 created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(organization_id,id),UNIQUE(organization_id,reversal_of),
 FOREIGN KEY(organization_id) REFERENCES organizations(id),FOREIGN KEY(organization_id,order_id) REFERENCES orders(organization_id,id),
 FOREIGN KEY(organization_id,reversal_of) REFERENCES expense_events(organization_id,id)
);
CREATE INDEX expense_date ON expense_events(organization_id,spent_on);

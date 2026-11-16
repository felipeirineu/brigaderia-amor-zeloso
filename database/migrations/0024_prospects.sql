-- R7a: aditiva, sem converter/apagar cadastros e sem dados de exemplo.
ALTER TABLE customers ADD COLUMN kind TEXT NOT NULL DEFAULT 'customer' CHECK(kind IN ('customer','prospect'));
CREATE INDEX customers_kind_list ON customers(organization_id,kind,active,name);
CREATE TABLE prospect_details (
  organization_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  PRIMARY KEY(organization_id,customer_id),
  FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
CREATE TABLE prospect_events (
  organization_id TEXT NOT NULL,
  id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL CHECK(to_stage IN ('to_visit','sample_delivered','follow_up','converted','not_interested')),
  next_step_at TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(organization_id,id),
  FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
CREATE INDEX prospect_events_customer ON prospect_events(organization_id,customer_id,created_at,id);

-- Aplicar somente após backup/exportação e ensaio de restauração separado.
-- Reconstrução aditiva preserva IDs, snapshots, versões, chaves e itens existentes.
PRAGMA defer_foreign_keys = ON;
CREATE TABLE orders_v2 (
  id TEXT NOT NULL, organization_id TEXT NOT NULL, customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','awaiting_confirmation','confirmed','in_production','ready','out_for_delivery','delivered','picked_up','cancelled')),
  due_at TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
  total_cents INTEGER NOT NULL CHECK(total_cents>=0), version INTEGER NOT NULL DEFAULT 1,
  mutation_id TEXT NOT NULL DEFAULT '', create_key TEXT, create_hash TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  request_key TEXT NOT NULL, request_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  order_type TEXT NOT NULL DEFAULT 'regular' CHECK(order_type IN ('regular','recurring','event')),
  delivery_type TEXT NOT NULL DEFAULT 'delivery' CHECK(delivery_type IN ('delivery','pickup')),
  delivery_address TEXT NOT NULL DEFAULT '',
  courier TEXT NOT NULL DEFAULT 'unassigned' CHECK(courier IN ('unassigned','owner','partner','courier')),
  courier_name TEXT NOT NULL DEFAULT '', courier_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK(courier_fee_cents>=0),
  recurrence_key TEXT,
  PRIMARY KEY(organization_id,id), UNIQUE(organization_id,request_key), UNIQUE(organization_id,recurrence_key),
  FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
INSERT INTO orders_v2(id,organization_id,customer_id,customer_name,status,due_at,notes,total_cents,version,mutation_id,create_key,create_hash,active,request_key,request_hash,created_at)
 SELECT id,organization_id,customer_id,customer_name,status,due_at,notes,total_cents,version,mutation_id,create_key,create_hash,active,request_key,request_hash,created_at FROM orders;
DROP TABLE orders;
ALTER TABLE orders_v2 RENAME TO orders;
CREATE INDEX orders_due ON orders(organization_id,active,due_at);
CREATE INDEX orders_status ON orders(organization_id,status,active,due_at);
CREATE TABLE order_status_events (
  id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL, order_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id), from_status TEXT NOT NULL, to_status TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '', order_version INTEGER NOT NULL,
  request_key TEXT NOT NULL, request_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()), undo_of TEXT,
  FOREIGN KEY(organization_id,order_id) REFERENCES orders(organization_id,id),
  UNIQUE(organization_id,request_key), UNIQUE(organization_id,undo_of)
);
CREATE INDEX order_events_lookup ON order_status_events(organization_id,order_id,created_at);
CREATE TABLE recurring_templates (
  id TEXT NOT NULL, organization_id TEXT NOT NULL, customer_id TEXT NOT NULL,
  name TEXT NOT NULL, weekday INTEGER NOT NULL CHECK(weekday BETWEEN 1 AND 7),
  time TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
  delivery_type TEXT NOT NULL DEFAULT 'delivery' CHECK(delivery_type IN ('delivery','pickup')),
  delivery_address TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), version INTEGER NOT NULL DEFAULT 1,
  mutation_id TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(organization_id,id), FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
CREATE TABLE recurring_items (
  id TEXT NOT NULL, organization_id TEXT NOT NULL, template_id TEXT NOT NULL, variant_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity>0), PRIMARY KEY(organization_id,id),
  FOREIGN KEY(organization_id,template_id) REFERENCES recurring_templates(organization_id,id),
  FOREIGN KEY(organization_id,variant_id) REFERENCES product_variants(organization_id,id),
  UNIQUE(organization_id,template_id,variant_id)
);
CREATE TABLE message_templates (
  organization_id TEXT NOT NULL REFERENCES organizations(id), kind TEXT NOT NULL,
  content TEXT NOT NULL, PRIMARY KEY(organization_id,kind)
);
CREATE TABLE contact_events (
  id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL, order_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id), template_kind TEXT NOT NULL,
  request_key TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(organization_id,order_id) REFERENCES orders(organization_id,id), UNIQUE(organization_id,request_key)
);
PRAGMA defer_foreign_keys = OFF;

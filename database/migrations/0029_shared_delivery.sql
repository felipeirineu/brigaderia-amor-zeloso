-- Ampliar o CHECK de entregador, em um único lote transacional.
-- Os vínculos para estas duas tabelas usam NO ACTION; as tabelas filhas permanecem no lugar.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE orders_t16 (
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
  courier TEXT NOT NULL DEFAULT 'unassigned' CHECK(courier IN ('unassigned','owner','partner','courier','both')),
  courier_name TEXT NOT NULL DEFAULT '', courier_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK(courier_fee_cents>=0),
  recurrence_key TEXT, occasion TEXT NOT NULL DEFAULT ''
 CHECK(occasion IN ('','children_party','birthday','wedding','corporate','gift','other')),
  PRIMARY KEY(organization_id,id), UNIQUE(organization_id,request_key), UNIQUE(organization_id,recurrence_key),
  FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
INSERT INTO orders_t16(rowid,id,organization_id,customer_id,customer_name,status,due_at,notes,total_cents,version,mutation_id,create_key,create_hash,active,request_key,request_hash,created_at,order_type,delivery_type,delivery_address,courier,courier_name,courier_fee_cents,recurrence_key,occasion)
 SELECT rowid,id,organization_id,customer_id,customer_name,status,due_at,notes,total_cents,version,mutation_id,create_key,create_hash,active,request_key,request_hash,created_at,order_type,delivery_type,delivery_address,courier,courier_name,courier_fee_cents,recurrence_key,occasion FROM orders;
DROP TABLE orders;
ALTER TABLE orders_t16 RENAME TO orders;
CREATE INDEX orders_due ON orders(organization_id,active,due_at);
CREATE INDEX orders_status ON orders(organization_id,status,active,due_at);

CREATE TABLE recurring_templates_t16 (
  id TEXT NOT NULL, organization_id TEXT NOT NULL, customer_id TEXT NOT NULL,
  name TEXT NOT NULL, weekday INTEGER NOT NULL CHECK(weekday BETWEEN 1 AND 7),
  time TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
  delivery_type TEXT NOT NULL DEFAULT 'delivery' CHECK(delivery_type IN ('delivery','pickup')),
  delivery_address TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), version INTEGER NOT NULL DEFAULT 1,
  mutation_id TEXT NOT NULL DEFAULT '', courier TEXT NOT NULL DEFAULT 'unassigned' CHECK(courier IN ('unassigned','owner','partner','courier','both')), courier_name TEXT NOT NULL DEFAULT '', courier_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK(courier_fee_cents>=0),
  PRIMARY KEY(organization_id,id), FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
INSERT INTO recurring_templates_t16(rowid,id,organization_id,customer_id,name,weekday,time,notes,delivery_type,delivery_address,active,version,mutation_id,courier,courier_name,courier_fee_cents)
 SELECT rowid,id,organization_id,customer_id,name,weekday,time,notes,delivery_type,delivery_address,active,version,mutation_id,courier,courier_name,courier_fee_cents FROM recurring_templates;
DROP TABLE recurring_templates;
ALTER TABLE recurring_templates_t16 RENAME TO recurring_templates;

-- Valida todos os vínculos antes de limpar as pendências transitórias do DROP TABLE.
CREATE TABLE t16_foreign_key_guard (violations INTEGER NOT NULL CHECK(violations=0));
INSERT INTO t16_foreign_key_guard SELECT COUNT(*) FROM pragma_foreign_key_check;
DROP TABLE t16_foreign_key_guard;
PRAGMA defer_foreign_keys = OFF;

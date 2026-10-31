-- Fase 1: isolamento por organização, dinheiro em centavos, snapshots imutáveis.
CREATE TABLE authorized_emails (
  email TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  role TEXT NOT NULL CHECK(role IN ('owner','operator'))
);
CREATE TABLE login_attempts (
  key TEXT PRIMARY KEY NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  window_start INTEGER NOT NULL
);
CREATE TABLE customers (
  id TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  version INTEGER NOT NULL DEFAULT 1,
  mutation_id TEXT NOT NULL DEFAULT '',
  create_key TEXT,
  create_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (organization_id,id),
  UNIQUE(organization_id,create_key),
  UNIQUE(organization_id,phone)
);
CREATE TABLE products (
  id TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  version INTEGER NOT NULL DEFAULT 1,
  mutation_id TEXT NOT NULL DEFAULT '',
  create_key TEXT,
  create_hash TEXT,
  PRIMARY KEY(organization_id,id),
  UNIQUE(organization_id,create_key)
);
CREATE TABLE product_variants (
  id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  label TEXT NOT NULL,
  weight_grams INTEGER NOT NULL CHECK(weight_grams > 0),
  units_per_box INTEGER NOT NULL CHECK(units_per_box > 0),
  price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  PRIMARY KEY(organization_id,id),
  FOREIGN KEY(organization_id,product_id) REFERENCES products(organization_id,id)
);
CREATE TABLE orders (
  id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status='draft'),
  due_at TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  total_cents INTEGER NOT NULL CHECK(total_cents >= 0),
  version INTEGER NOT NULL DEFAULT 1,
  mutation_id TEXT NOT NULL DEFAULT '',
  create_key TEXT,
  create_hash TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  request_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(organization_id,id),
  UNIQUE(organization_id,request_key),
  FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
CREATE INDEX orders_due ON orders(organization_id,active,due_at);
CREATE TABLE order_items (
  id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variant_label TEXT NOT NULL,
  weight_grams INTEGER NOT NULL,
  units_per_box INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents >= 0),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  PRIMARY KEY(organization_id,id),
  FOREIGN KEY(organization_id,order_id) REFERENCES orders(organization_id,id),
  FOREIGN KEY(organization_id,variant_id) REFERENCES product_variants(organization_id,id)
);
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
-- O audit registra IDs/ações; nunca corpo de requisição ou dados pessoais.
ALTER TABLE users ADD COLUMN email TEXT;

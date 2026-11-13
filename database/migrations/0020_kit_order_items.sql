-- R18: ampliar o catálogo antes de criar qualquer referência a kits.
-- Cadastro de kits separado dos sabores; sem produtos, preços ou custos semeados.
CREATE TABLE kits_expanded (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,
 weight_grams INTEGER NOT NULL CHECK(weight_grams BETWEEN 1 AND 500),
 dough_weight_grams INTEGER CHECK(dough_weight_grams>0 AND dough_weight_grams<=weight_grams),
 units_per_kit INTEGER NOT NULL CHECK(units_per_kit BETWEEN 1 AND 500),
 price_cents INTEGER NOT NULL CHECK(price_cents BETWEEN 0 AND 100000000),
 max_flavors INTEGER NOT NULL CHECK(max_flavors>0 AND max_flavors<=units_per_kit),
 packaging_supply_id TEXT,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 version INTEGER NOT NULL DEFAULT 1,mutation_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,id),
 UNIQUE(organization_id,weight_grams,units_per_kit),
 FOREIGN KEY(organization_id) REFERENCES organizations(id),
 FOREIGN KEY(organization_id,packaging_supply_id) REFERENCES supplies(organization_id,id)
);
INSERT INTO kits_expanded SELECT * FROM kits;
DROP TABLE kits;
ALTER TABLE kits_expanded RENAME TO kits;

-- Itens de kit não usam variantes artificiais. Itens antigos ficam intactos.
CREATE TABLE kit_order_items (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,order_id TEXT NOT NULL,kit_id TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 10000),
 weight_grams INTEGER NOT NULL CHECK(weight_grams>0),dough_weight_grams INTEGER,
 units_per_kit INTEGER NOT NULL CHECK(units_per_kit>0),
 unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents BETWEEN 0 AND 100000000),
 packaging_supply_id TEXT,
 PRIMARY KEY(organization_id,id),
 FOREIGN KEY(organization_id,order_id) REFERENCES orders(organization_id,id),
 FOREIGN KEY(organization_id,kit_id) REFERENCES kits(organization_id,id),
 FOREIGN KEY(organization_id,packaging_supply_id) REFERENCES supplies(organization_id,id)
);
CREATE TABLE kit_order_components (
 organization_id TEXT NOT NULL,item_id TEXT NOT NULL,product_id TEXT NOT NULL,
 units INTEGER NOT NULL CHECK(units BETWEEN 1 AND 500),
 product_name TEXT NOT NULL,photo_key TEXT,contains_alcohol INTEGER NOT NULL CHECK(contains_alcohol IN(0,1)),
 PRIMARY KEY(organization_id,item_id,product_id),
 FOREIGN KEY(organization_id,item_id) REFERENCES kit_order_items(organization_id,id) ON DELETE CASCADE,
 FOREIGN KEY(organization_id,product_id) REFERENCES products(organization_id,id)
);

-- Composições de kits em modelos; sem alterar modelos/itens legados.
CREATE TABLE kit_recurring_items (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,template_id TEXT NOT NULL,kit_id TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 10000),
 weight_grams INTEGER NOT NULL CHECK(weight_grams>0),dough_weight_grams INTEGER,
 units_per_kit INTEGER NOT NULL CHECK(units_per_kit>0),
 unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents BETWEEN 0 AND 100000000),
 packaging_supply_id TEXT,
 PRIMARY KEY(organization_id,id),
 FOREIGN KEY(organization_id,template_id) REFERENCES recurring_templates(organization_id,id),
 FOREIGN KEY(organization_id,kit_id) REFERENCES kits(organization_id,id),
 FOREIGN KEY(organization_id,packaging_supply_id) REFERENCES supplies(organization_id,id)
);
CREATE INDEX kit_recurring_items_template ON kit_recurring_items(organization_id,template_id);
CREATE TABLE kit_recurring_components (
 organization_id TEXT NOT NULL,item_id TEXT NOT NULL,product_id TEXT NOT NULL,
 units INTEGER NOT NULL CHECK(units BETWEEN 1 AND 500),
 product_name TEXT NOT NULL,photo_key TEXT,contains_alcohol INTEGER NOT NULL CHECK(contains_alcohol IN(0,1)),
 PRIMARY KEY(organization_id,item_id,product_id),
 FOREIGN KEY(organization_id,item_id) REFERENCES kit_recurring_items(organization_id,id) ON DELETE CASCADE,
 FOREIGN KEY(organization_id,product_id) REFERENCES products(organization_id,id)
);

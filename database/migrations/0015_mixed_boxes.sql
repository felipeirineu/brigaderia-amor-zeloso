-- Composição por caixa; quantidade de caixas permanece no item pai.
-- Aditiva: nenhum item existente é modificado.
CREATE TABLE order_item_components (
 organization_id TEXT NOT NULL,
 item_id TEXT NOT NULL,
 variant_id TEXT NOT NULL,
 units INTEGER NOT NULL CHECK(units>0 AND units<=10000),
 product_name TEXT NOT NULL,
 variant_label TEXT NOT NULL,
 weight_grams INTEGER NOT NULL CHECK(weight_grams>0),
 units_per_box INTEGER NOT NULL CHECK(units_per_box>0),
 PRIMARY KEY(organization_id,item_id,variant_id),
 FOREIGN KEY(organization_id,item_id) REFERENCES order_items(organization_id,id) ON DELETE CASCADE,
 FOREIGN KEY(organization_id,variant_id) REFERENCES product_variants(organization_id,id)
);

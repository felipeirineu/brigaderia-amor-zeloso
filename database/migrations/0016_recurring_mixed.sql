-- Aditiva: modelos e itens simples existentes permanecem intactos.
CREATE TABLE recurring_mixed_items (
 organization_id TEXT NOT NULL,
 id TEXT NOT NULL,
 template_id TEXT NOT NULL,
 variant_id TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity>0 AND quantity<=10000),
 composition_key TEXT NOT NULL,
 PRIMARY KEY(organization_id,id),
 UNIQUE(organization_id,template_id,composition_key),
 FOREIGN KEY(organization_id,template_id) REFERENCES recurring_templates(organization_id,id),
 FOREIGN KEY(organization_id,variant_id) REFERENCES product_variants(organization_id,id)
);
CREATE TABLE recurring_mixed_components (
 organization_id TEXT NOT NULL,
 item_id TEXT NOT NULL,
 variant_id TEXT NOT NULL,
 units INTEGER NOT NULL CHECK(units>0 AND units<=10000),
 PRIMARY KEY(organization_id,item_id,variant_id),
 FOREIGN KEY(organization_id,item_id) REFERENCES recurring_mixed_items(organization_id,id) ON DELETE CASCADE,
 FOREIGN KEY(organization_id,variant_id) REFERENCES product_variants(organization_id,id)
);

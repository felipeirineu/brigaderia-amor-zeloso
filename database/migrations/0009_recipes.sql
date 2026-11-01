CREATE TABLE supplies (
 id TEXT NOT NULL,organization_id TEXT NOT NULL,name TEXT NOT NULL,unit TEXT NOT NULL CHECK(unit IN ('g','ml','unit')),
 pack_quantity_milli INTEGER NOT NULL CHECK(pack_quantity_milli>0),pack_cost_cents INTEGER CHECK(pack_cost_cents>=0),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),version INTEGER NOT NULL DEFAULT 1,mutation_id TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(organization_id,id),FOREIGN KEY(organization_id) REFERENCES organizations(id)
);
CREATE TABLE recipes (
 id TEXT NOT NULL,organization_id TEXT NOT NULL,name TEXT NOT NULL,variant_id TEXT,
 yield_units INTEGER NOT NULL CHECK(yield_units>0),packaging_cents INTEGER NOT NULL CHECK(packaging_cents>=0),
 labor_cents INTEGER NOT NULL CHECK(labor_cents>=0),overhead_cents INTEGER NOT NULL CHECK(overhead_cents>=0),
 margin_bps INTEGER NOT NULL CHECK(margin_bps BETWEEN 0 AND 9500),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),version INTEGER NOT NULL DEFAULT 1,mutation_id TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(organization_id,id),FOREIGN KEY(organization_id,variant_id) REFERENCES product_variants(organization_id,id)
);
CREATE UNIQUE INDEX recipes_active_variant ON recipes(organization_id,variant_id) WHERE active=1 AND variant_id IS NOT NULL;
CREATE TABLE recipe_components (
 organization_id TEXT NOT NULL,recipe_id TEXT NOT NULL,supply_id TEXT NOT NULL,quantity_milli INTEGER NOT NULL CHECK(quantity_milli>0),
 PRIMARY KEY(organization_id,recipe_id,supply_id),FOREIGN KEY(organization_id,recipe_id) REFERENCES recipes(organization_id,id),
 FOREIGN KEY(organization_id,supply_id) REFERENCES supplies(organization_id,id)
);

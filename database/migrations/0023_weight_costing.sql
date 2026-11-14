-- Cadastro por sabor, sem converter fichas antigas nem gravar custos/preços de exemplo.
CREATE TABLE weight_recipes (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,product_id TEXT NOT NULL,
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),version INTEGER NOT NULL DEFAULT 1,
 mutation_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,id),UNIQUE(organization_id,product_id),
 FOREIGN KEY(organization_id,product_id) REFERENCES products(organization_id,id)
);
CREATE TABLE weight_recipe_supplies (
 organization_id TEXT NOT NULL,recipe_id TEXT NOT NULL,supply_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,recipe_id,supply_id),
 FOREIGN KEY(organization_id,recipe_id) REFERENCES weight_recipes(organization_id,id) ON DELETE CASCADE,
 FOREIGN KEY(organization_id,supply_id) REFERENCES supplies(organization_id,id)
);
CREATE INDEX weight_recipe_supplies_supply ON weight_recipe_supplies(organization_id,supply_id);
CREATE TABLE costing_settings (
 organization_id TEXT NOT NULL,id TEXT NOT NULL CHECK(id=organization_id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 version INTEGER NOT NULL DEFAULT 1,mutation_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,id),FOREIGN KEY(organization_id) REFERENCES organizations(id)
);
CREATE TABLE costing_setting_supplies (
 organization_id TEXT NOT NULL,supply_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,supply_id),
 FOREIGN KEY(organization_id,organization_id) REFERENCES costing_settings(organization_id,id) ON DELETE CASCADE,
 FOREIGN KEY(organization_id,supply_id) REFERENCES supplies(organization_id,id)
);

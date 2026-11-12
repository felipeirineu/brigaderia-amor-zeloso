-- Cadastro de kits separado dos sabores; sem produtos, preços ou custos semeados.
CREATE TABLE kits (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,
 weight_grams INTEGER NOT NULL CHECK(weight_grams IN(15,23,30)),
 dough_weight_grams INTEGER CHECK(dough_weight_grams>0 AND dough_weight_grams<=weight_grams),
 units_per_kit INTEGER NOT NULL CHECK(units_per_kit IN(12,25,50,100)),
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
CREATE TABLE kit_settings (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,
 limit_flavors INTEGER NOT NULL DEFAULT 1 CHECK(limit_flavors IN(0,1)),
 version INTEGER NOT NULL DEFAULT 1,mutation_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,id),CHECK(id=organization_id),
 FOREIGN KEY(organization_id) REFERENCES organizations(id)
);

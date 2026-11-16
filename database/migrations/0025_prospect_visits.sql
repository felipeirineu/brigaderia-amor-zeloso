-- R7b: agendamentos e registros separados de pedidos/vendas; sem dados de exemplo.
CREATE TABLE prospect_visits (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,customer_id TEXT NOT NULL,
 scheduled_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN('scheduled','completed','cancelled')),
 data TEXT NOT NULL CHECK(json_valid(data)),version INTEGER NOT NULL DEFAULT 1,mutation_id TEXT,
 created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(organization_id,id),
 FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
CREATE INDEX prospect_visits_day ON prospect_visits(organization_id,status,scheduled_at);
CREATE INDEX prospect_visits_range ON prospect_visits(organization_id,scheduled_at,id);
CREATE INDEX prospect_visits_customer ON prospect_visits(organization_id,customer_id,scheduled_at);
CREATE TABLE prospect_visit_records (
 organization_id TEXT NOT NULL,visit_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),
 data TEXT NOT NULL CHECK(json_valid(data)),created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(organization_id,visit_id),
 FOREIGN KEY(organization_id,visit_id) REFERENCES prospect_visits(organization_id,id)
);
-- Vínculo operacional: acompanha a limpeza dos deslocamentos de teste, não o KEEP dos contatos.
CREATE TABLE prospect_visit_trips (
 organization_id TEXT NOT NULL,displacement_id TEXT NOT NULL,visit_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,displacement_id),
 FOREIGN KEY(organization_id,displacement_id) REFERENCES displacements(organization_id,id),
 FOREIGN KEY(organization_id,visit_id) REFERENCES prospect_visits(organization_id,id)
);
CREATE INDEX prospect_visit_trips_visit ON prospect_visit_trips(organization_id,visit_id);

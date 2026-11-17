-- Vínculo operacional de pagamento confirmado; não cria despesa ou dado de exemplo.
CREATE TABLE prospect_sample_expenses (
 organization_id TEXT NOT NULL,expense_id TEXT NOT NULL,visit_id TEXT NOT NULL,
 data TEXT NOT NULL CHECK(json_valid(data)),
 PRIMARY KEY(organization_id,expense_id),
 FOREIGN KEY(organization_id,expense_id) REFERENCES expense_events(organization_id,id),
 FOREIGN KEY(organization_id,visit_id) REFERENCES prospect_visits(organization_id,id)
);
CREATE INDEX prospect_sample_expenses_visit ON prospect_sample_expenses(organization_id,visit_id);

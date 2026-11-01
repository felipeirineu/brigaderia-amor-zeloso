-- Somente defaults novos; não atribuir entregador a pedidos existentes.
ALTER TABLE recurring_templates ADD COLUMN courier TEXT NOT NULL DEFAULT 'unassigned' CHECK(courier IN ('unassigned','owner','partner','courier'));
ALTER TABLE recurring_templates ADD COLUMN courier_name TEXT NOT NULL DEFAULT '';
ALTER TABLE recurring_templates ADD COLUMN courier_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK(courier_fee_cents>=0);

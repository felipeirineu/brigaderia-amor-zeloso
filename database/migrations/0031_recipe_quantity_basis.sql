-- Fichas existentes continuam com a quantidade informada para o lote inteiro.
ALTER TABLE recipe_components ADD COLUMN quantity_basis TEXT NOT NULL DEFAULT 'batch'
 CHECK(quantity_basis IN ('batch','unit'));

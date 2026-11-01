-- Metadados opcionais, sem produtos, preços ou vínculos preenchidos automaticamente.
ALTER TABLE products ADD COLUMN photo_key TEXT;
ALTER TABLE product_variants ADD COLUMN photo_key TEXT;

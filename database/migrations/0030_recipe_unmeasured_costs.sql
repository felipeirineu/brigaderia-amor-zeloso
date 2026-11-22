-- Custos não calculados por ficha, inclusive para fichas já cadastradas.
ALTER TABLE recipes ADD COLUMN unmeasured_bps INTEGER NOT NULL DEFAULT 2000
 CHECK(typeof(unmeasured_bps) = 'integer' AND unmeasured_bps BETWEEN 0 AND 10000);

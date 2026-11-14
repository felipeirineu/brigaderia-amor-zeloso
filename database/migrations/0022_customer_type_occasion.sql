-- Aditiva: nenhum cadastro/pedido antigo é convertido ou removido.
ALTER TABLE customers ADD COLUMN customer_type TEXT NOT NULL DEFAULT 'establishment'
 CHECK(customer_type IN ('establishment','person'));
ALTER TABLE orders ADD COLUMN occasion TEXT NOT NULL DEFAULT ''
 CHECK(occasion IN ('','children_party','birthday','wedding','corporate','gift','other'));

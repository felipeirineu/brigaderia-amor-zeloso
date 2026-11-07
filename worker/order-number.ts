/** Número sequencial do pedido na organização, calculado na leitura (sem migração). */
export const orderNumber = (alias: string) =>
  `(SELECT COUNT(*) FROM orders n WHERE n.organization_id=${alias}.organization_id AND (n.created_at<${alias}.created_at OR (n.created_at=${alias}.created_at AND n.id<=${alias}.id))) AS number`;

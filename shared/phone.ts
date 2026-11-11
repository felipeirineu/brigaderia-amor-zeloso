// Cliente sem telefone: o banco exige telefone único e não nulo
// (UNIQUE(organization_id, phone), migração 0002). Em vez de reconstruir a
// tabela, guardamos um marcador único por cliente, que nunca sai pela API.
export const noPhone = (customerId: string) => 'sem:' + customerId;
export const hasPhone = (stored: unknown) =>
  typeof stored === 'string' && stored.startsWith('+');
export const visiblePhone = (stored: unknown) =>
  hasPhone(stored) ? (stored as string) : '';
/** Trecho SQL: telefone real ou vazio. */
export const sqlVisiblePhone = (column: string) =>
  `CASE WHEN ${column} LIKE '+%' THEN ${column} ELSE '' END`;

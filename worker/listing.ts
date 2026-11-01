/** Hidrata no máximo 200 pais em lotes abaixo do limite de 100 bindings do D1. */
export async function childrenByParent(
  db: D1Database,
  organization: string,
  kind: 'products' | 'orders',
  ids: string[],
) {
  const table = kind === 'products' ? 'product_variants' : 'order_items';
  const foreignKey = kind === 'products' ? 'product_id' : 'order_id';
  const grouped = new Map<string, Record<string, unknown>[]>();
  // 90 IDs + organização: até 3 consultas para uma página de 200 pais.
  for (let offset = 0; offset < ids.length; offset += 90) {
    const chunk = ids.slice(offset, offset + 90);
    const { results } = await db
      .prepare(
        `SELECT * FROM ${table} WHERE organization_id=? AND ${foreignKey} IN (${chunk.map(() => '?').join(',')}) ORDER BY ${foreignKey},${kind === 'products' ? 'label,' : ''}id`,
      )
      .bind(organization, ...chunk)
      .all<Record<string, unknown>>();
    for (const row of results) {
      const parent = String(row[foreignKey]);
      const entries = grouped.get(parent) ?? [];
      entries.push(row);
      grouped.set(parent, entries);
    }
  }
  return grouped;
}

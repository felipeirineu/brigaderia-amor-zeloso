import { HttpError } from './security';
import type { CustomerType } from '../shared/customer-order';
import type { Terms } from '../shared/finance';
export async function customerOrderFieldsReady(db: D1Database) {
  const r = await db
    .prepare(
      "SELECT (SELECT COUNT(*) FROM pragma_table_info('customers') WHERE name='customer_type')+(SELECT COUNT(*) FROM pragma_table_info('orders') WHERE name='occasion') n",
    )
    .first<{ n: number }>();
  return r?.n === 2;
}
/** Executado no mesmo batch/CAS do cabeçalho. Omissão de editor antigo conserva o valor. */
export async function customerOrderFieldWrite(
  db: D1Database,
  org: string,
  id: string,
  nonce: string,
  field: 'customer_type' | 'occasion',
  value: string | undefined,
) {
  if (value === undefined) return [];
  if (!(await customerOrderFieldsReady(db)))
    throw new HttpError(
      503,
      'Tipo de cliente e ocasião aguardam a migração 0022.',
    );
  const table = field === 'customer_type' ? 'customers' : 'orders';
  return [
    db
      .prepare(
        `UPDATE ${table} SET ${field}=? WHERE organization_id=? AND id=? AND mutation_id=?`,
      )
      .bind(value, org, id, nonce),
  ];
}
export function checkPersonTerms(
  type: CustomerType,
  terms: Pick<Terms, 'mode'>,
  confirming = false,
) {
  if (
    type === 'person' &&
    (terms.mode === 'credit' ||
      (confirming &&
        !['advance', 'delivery', 'next_delivery'].includes(terms.mode)))
  )
    throw new HttpError(
      400,
      'Para pessoa, escolha pagamento adiantado, na entrega ou na próxima entrega.',
    );
}

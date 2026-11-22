import { customerType } from '../shared/customer-order';
import { emptyTerms } from '../shared/finance';
import type { Status } from '../shared/order-state';
import { checkPersonTerms } from './customer-order';
import { financeReady } from './finance-ready';
import { validateMixedConfirmation } from './mixed';
import { HttpError, type Actor, type Env } from './security';

type Row = Record<string, string | number | null>;

export async function validateOrderStatus(
  env: Env,
  a: Actor,
  order: Row,
  target: Status,
) {
  const db = env.DB!,
    org = a.organization_id,
    id = String(order.id);
  if (target === 'out_for_delivery' && order.courier === 'unassigned')
    throw new HttpError(400, 'Selecione quem fará a entrega antes da saída.');
  if (
    target === 'confirmed' &&
    order.delivery_type === 'delivery' &&
    !String(order.delivery_address).trim()
  )
    throw new HttpError(
      400,
      'Informe o endereço de entrega ou selecione retirada antes de confirmar.',
    );
  if (target === 'confirmed') {
    await validateMixedConfirmation(env, org, id);
    const payer = await db
      .prepare('SELECT * FROM customers WHERE organization_id=? AND id=?')
      .bind(org, order.customer_id)
      .first<Row>();
    if (customerType(payer) === 'person') {
      if (!(await financeReady(env)))
        throw new HttpError(
          503,
          'Ative o financeiro antes de confirmar pedidos de pessoa.',
        );
      const terms = await db
        .prepare(
          'SELECT data FROM order_terms WHERE organization_id=? AND order_id=?',
        )
        .bind(org, id)
        .first<{ data: string }>();
      checkPersonTerms(
        'person',
        terms ? JSON.parse(terms.data) : emptyTerms(),
        true,
      );
    }
  }
}

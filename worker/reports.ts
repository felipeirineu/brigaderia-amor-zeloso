import { paymentModeLabels } from '../shared/finance';
import { flavorLines, flavorItemTexts } from './flavor-lines';
import { z } from 'zod';
import { receivables } from './receivables';
import { businessDay, addDays } from './operations-domain';
import { HttpError, json, type Actor } from './security';
import { requestRange } from './p1-common';
import { exportResponse } from './report-export';
import {
  label,
  dateColumn,
  countColumn,
  moneyColumn,
  type ExportTable,
} from '../shared/report-export';
export async function reports(req: Request, db: D1Database, a: Actor) {
  const { from, to } = requestRange(req),
    url = new URL(req.url),
    org = a.organization_id,
    mode = url.searchParams.get('condition') || 'all',
    customer = url.searchParams.get('customer') || '';
  if (
    !z
      .enum(['all', 'unset', 'advance', 'delivery', 'next_delivery', 'credit'])
      .safeParse(mode).success ||
    (customer && !z.uuid().safeParse(customer).success)
  )
    throw new HttpError(400, 'Filtro inválido.');
  const all = (await receivables(db, org)).filter(
    (o) =>
      (mode === 'all' || o.terms.mode === mode) &&
      (!customer || o.customer_id === customer),
  );
  const sold = all.filter(
    (o) => o.business_date >= from && o.business_date <= to,
  );
  if (sold.length > 1000)
    throw new HttpError(
      409,
      'Mais de 1000 vendas no período; reduza o período.',
    );
  const selected = sold.map((o) => o.id),
    items = await flavorLines(db, org, selected);
  const clients = new Map<
      string,
      { id: string; name: string; orders: number; total_cents: number }
    >(),
    products = new Map<
      string,
      {
        name: string;
        variant: string;
        display_name: string;
        weight_grams: number;
        units_per_box: number;
        boxes: number;
        mixed_units: number;
        units: number;
        total_cents: number;
      }
    >(),
    conditions = new Map<string, number>();
  for (const o of sold) {
    const c = clients.get(o.customer_id) || {
      id: o.customer_id,
      name: o.customer_name,
      orders: 0,
      total_cents: 0,
    };
    c.orders++;
    c.total_cents += o.total_cents;
    clients.set(c.id, c);
    conditions.set(
      o.terms.mode,
      (conditions.get(o.terms.mode) || 0) + o.total_cents,
    );
  }
  for (const i of items) {
    const key = JSON.stringify([
        i.product_name,
        i.variant_label,
        i.weight_grams,
        i.units_per_box,
      ]),
      p = products.get(key) || {
        name: i.product_name,
        variant: i.variant_label,
        display_name: i.display_name,
        weight_grams: i.weight_grams,
        units_per_box: i.units_per_box,
        boxes: 0,
        mixed_units: 0,
        units: 0,
        total_cents: 0,
      };
    if (i.show_variant) p.display_name = i.display_name;
    p.boxes += i.boxes;
    p.units += i.units;
    p.mixed_units += i.mixed ? i.units : 0;
    p.total_cents += i.allocated_cents;
    products.set(key, p);
  }
  const received = await db
    .prepare(
      "SELECT COALESCE(SUM(CASE WHEN kind='reversal' THEN -amount_cents ELSE amount_cents END),0) AS cents FROM payment_events WHERE organization_id=? AND paid_on>=? AND paid_on<=?" +
        (customer ? ' AND customer_id=?' : ''),
    )
    .bind(org, from, to, ...(customer ? [customer] : []))
    .first<{ cents: number }>();
  const ageing = all
    .filter((o) => o.balance_cents > 0)
    .map((o) => ({
      order_id: o.id,
      customer_id: o.customer_id,
      customer_name: o.customer_name,
      due_on: o.due_on,
      balance_cents: o.balance_cents,
      overdue_days: o.overdue_days,
      bucket: !o.due_on
        ? 'A definir'
        : o.overdue_days === 0
          ? 'A vencer'
          : o.overdue_days <= 7
            ? '1–7 dias'
            : o.overdue_days <= 30
              ? '8–30 dias'
              : o.overdue_days <= 60
                ? '31–60 dias'
                : '61+ dias',
    }));
  const linesByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const group = linesByOrder.get(item.order_id) ?? [];
    group.push(item);
    linesByOrder.set(item.order_id, group);
  }
  const orders = sold.map((o) => ({
    id: o.id,
    customer_name: o.customer_name,
    items_text: flavorItemTexts(linesByOrder.get(o.id) ?? []).join('; '),
    date: o.business_date,
    total_cents: o.total_cents,
    paid_cents: o.paid_cents,
    balance_cents: o.balance_cents,
    condition: o.terms.mode,
    cycle: o.terms.cycle,
  }));
  const days =
      Math.round(
        (Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) /
          86400000,
      ) + 1,
    previousFrom = addDays(from, -days),
    previousTo = addDays(from, -1),
    previous = all.filter(
      (o) => o.business_date >= previousFrom && o.business_date <= previousTo,
    ),
    previousCents = previous.reduce((n, o) => n + o.total_cents, 0),
    currentCents = sold.reduce((n, o) => n + o.total_cents, 0);
  const weeklyMap = new Map<
    string,
    { week: string; orders: number; total_cents: number }
  >();
  for (const o of sold) {
    const d = new Date(o.business_date + 'T12:00:00Z'),
      week = addDays(o.business_date, -((d.getUTCDay() + 6) % 7)),
      entry = weeklyMap.get(week) || { week, orders: 0, total_cents: 0 };
    entry.orders++;
    entry.total_cents += o.total_cents;
    weeklyMap.set(week, entry);
  }
  const currentClients = new Set(sold.map((o) => o.customer_id)),
    last = new Map<
      string,
      { id: string; name: string; last_delivery: string }
    >();
  for (const o of all) {
    if (o.business_date < from && !currentClients.has(o.customer_id)) {
      const old = last.get(o.customer_id);
      if (!old || old.last_delivery < o.business_date)
        last.set(o.customer_id, {
          id: o.customer_id,
          name: o.customer_name,
          last_delivery: o.business_date,
        });
    }
  }
  const result = {
    from,
    to,
    comparison: {
      from: previousFrom,
      to: previousTo,
      sales_cents: previousCents,
      change_cents: currentCents - previousCents,
      change_percent: previousCents
        ? Math.round(((currentCents - previousCents) / previousCents) * 10000) /
          100
        : null,
    },
    weekly: [...weeklyMap.values()].sort((a, b) =>
      a.week.localeCompare(b.week),
    ),
    without_deliveries: [...last.values()],
    position_day: businessDay(),
    sales_cents: sold.reduce((n, o) => n + o.total_cents, 0),
    orders_count: sold.length,
    revenue_allocation: 'unidades por sabor; maior resto por item',
    received_cents: received?.cents ?? 0,
    received_scope:
      mode === 'all'
        ? 'cliente/período'
        : 'recebimentos do cliente/período, sem atribuir condição ao dinheiro não alocado',
    receivable_cents: ageing.reduce((n, o) => n + o.balance_cents, 0),
    orders,
    customers: [...clients.values()].sort(
      (a, b) => b.total_cents - a.total_cents || a.name.localeCompare(b.name),
    ),
    products: [...products.values()].sort(
      (a, b) => b.units - a.units || a.name.localeCompare(b.name),
    ),
    conditions: [...conditions].map(([mode, total_cents]) => ({
      mode,
      total_cents,
    })),
    aging: ageing,
  };
  if (!url.pathname.endsWith('.csv')) return json(result);
  const kind = z
    .enum([
      'orders',
      'customers',
      'products',
      'aging',
      'weeks',
      'without_deliveries',
    ])
    .parse(url.searchParams.get('kind') || 'orders');
  const datasets: Record<typeof kind, ExportTable> = {
    orders: {
      columns: [
        label('Pedido'),
        label('Cliente'),
        dateColumn('Data efetiva'),
        label('Itens e composição'),
        moneyColumn('Total'),
        moneyColumn('Recebido atual'),
        moneyColumn('Saldo atual'),
        label('Condição'),
        label('Periodicidade'),
      ],
      rows: orders.map((o) => [
        o.id,
        o.customer_name,
        o.date,
        o.items_text,
        o.total_cents,
        o.paid_cents,
        o.balance_cents,
        o.condition === 'next_delivery'
          ? paymentModeLabels.next_delivery
          : o.condition,
        o.cycle,
      ]),
    },
    customers: {
      columns: [
        label('Cliente'),
        countColumn('Pedidos', true),
        moneyColumn('Vendas'),
      ],
      rows: result.customers.map((c) => [c.name, c.orders, c.total_cents]),
    },
    products: {
      columns: [
        label('Produto/sabor (snapshot)'),
        label('Variante'),
        countColumn('Peso g'),
        countColumn('Unidades por embalagem'),
        countColumn('Caixas de um sabor', true),
        countColumn('Unidades', true),
        countColumn('Unidades em Caixas Mistas', true),
        countColumn('Caixas equivalentes (unidades/capacidade)', true),
        moneyColumn('Vendas atribuídas por unidades'),
      ],
      rows: result.products.map((p) => [
        p.name,
        p.variant,
        p.weight_grams,
        p.units_per_box,
        p.boxes,
        p.units,
        p.mixed_units,
        Number((p.units / p.units_per_box).toFixed(4)),
        p.total_cents,
      ]),
    },
    weeks: {
      columns: [
        dateColumn('Segunda-feira da semana'),
        countColumn('Pedidos', true),
        moneyColumn('Vendas'),
      ],
      rows: result.weekly.map((w) => [w.week, w.orders, w.total_cents]),
    },
    without_deliveries: {
      columns: [
        label('Cliente'),
        dateColumn('Última entrega antes do período'),
      ],
      rows: result.without_deliveries.map((c) => [c.name, c.last_delivery]),
    },
    aging: {
      columns: [
        label('Pedido'),
        label('Cliente'),
        dateColumn('Vencimento'),
        moneyColumn('Saldo'),
        countColumn('Dias vencidos'),
        label('Faixa'),
      ],
      rows: ageing.map((o) => [
        o.order_id,
        o.customer_name,
        o.due_on,
        o.balance_cents,
        o.overdue_days,
        o.bucket,
      ]),
    },
  };
  const table = datasets[kind];
  if (kind === 'orders')
    table.summary = [{ label: 'Pedidos', value: table.rows.length }];
  if (kind === 'customers')
    table.summary = [{ label: 'Clientes', value: table.rows.length }];
  return exportResponse(req, table, `relatorio-${kind}.csv`);
}

import { SkeletonList } from '../../components/Skeleton';
import { ChoiceChips } from '../../components/ChoiceChips';
import { Button } from '../../components/Button';
import { useState } from 'react';
import { useRemote, Failure, localDay } from '../operations/common';
import { money, civilDate } from '../api';
import { ExportActions } from '../report-export/ExportActions';
interface Report {
  comparison: {
    from: string;
    to: string;
    sales_cents: number;
    change_cents: number;
    change_percent: number | null;
  };
  weekly: { week: string; orders: number; total_cents: number }[];
  without_deliveries: { id: string; name: string; last_delivery: string }[];
  sales_cents: number;
  orders_count: number;
  received_cents: number;
  receivable_cents: number;
  position_day: string;
  customers: {
    id: string;
    name: string;
    orders: number;
    total_cents: number;
  }[];
  products: {
    name: string;
    variant: string;
    display_name: string;
    weight_grams: number;
    units_per_box: number;
    boxes: number;
    mixed_units: number;
    units: number;
    total_cents: number;
  }[];
  conditions: { mode: string; total_cents: number }[];
  aging: {
    order_id: string;
    customer_name: string;
    due_on: string | null;
    balance_cents: number;
    overdue_days: number;
    bucket: string;
  }[];
}
const kinds = {
  orders: ['Pedidos vendidos', 'pedidos-vendidos'],
  customers: ['Vendas por cliente', 'vendas-por-cliente'],
  products: ['Vendas por produto/sabor', 'vendas-por-sabor'],
  aging: ['Contas a receber atual', 'contas-a-receber'],
  weeks: ['Semana a semana', 'semana-a-semana'],
  without_deliveries: [
    'Clientes sem entregas no período',
    'clientes-sem-entregas',
  ],
} as const;
const conditions = [
  ['all', 'Todas'],
  ['unset', 'A definir'],
  ['advance', 'Adiantado'],
  ['delivery', 'Na entrega'],
  ['credit', 'A prazo'],
] satisfies [string, string][];

export function Reports({ followup = false }: { followup?: boolean }) {
  const [from, setFrom] = useState(() => localDay().slice(0, 8) + '01'),
    [to, setTo] = useState(localDay),
    [condition, setCondition] = useState('all'),
    [customer, setCustomer] = useState(''),
    [kind, setKind] = useState<keyof typeof kinds>('orders');
  const query = `from=${from}&to=${to}&condition=${condition}${customer ? '&customer=' + customer : ''}`,
    view = useRemote<Report>('p1/reports?' + query),
    customers = useRemote<{ id: string; name: string }[]>(
      'customers?active=all',
    );
  return (
    <>
      {followup && (
        <Button to="/gestao/prospeccao" variant="ghost">
          Ver relatório de prospecção
        </Button>
      )}
      <h1 className="mobile-context-title">Relatórios</h1>
      <Failure message={view.error || customers.error} />
      <div className="data-form panel">
        <label>
          Vendas de
          <input
            type="date"
            required
            value={from}
            onChange={(e) => {
              if (e.target.value) setFrom(e.target.value);
            }}
          />
        </label>
        <label>
          Vendas até
          <input
            type="date"
            required
            value={to}
            onChange={(e) => {
              if (e.target.value) setTo(e.target.value);
            }}
          />
        </label>
        <ChoiceChips
          label="Condição das vendas"
          value={condition}
          onChange={setCondition}
          options={conditions}
        />
        <label>
          Cliente do relatório
          <select
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          >
            <option value="">Todos</option>
            {customers.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <section className="panel data-form report-export-panel">
        <h2>Exportar</h2>
        <label>
          Relatório
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as keyof typeof kinds)}
          >
            {Object.entries(kinds).map(([value, [title]]) => (
              <option key={value} value={value}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <ExportActions
          key={query + kind}
          path={'p1/reports.csv?' + query + '&kind=' + kind}
          csvName={'relatorio-' + kind + '.csv'}
          title={kinds[kind][0]}
          slug={kinds[kind][1]}
          from={from}
          to={to}
          filters={[
            customer
              ? (customers.data?.find((c) => c.id === customer)?.name ??
                'Cliente selecionado')
              : 'Todos os clientes',
            condition === 'all'
              ? ''
              : conditions.find(([value]) => value === condition)?.[1],
            kind === 'aging' ? 'Saldo atual, independente do período' : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      </section>
      {!view.data && !view.error && (
        <SkeletonList label="Carregando relatórios…" />
      )}
      {view.data && (
        <>
          <section className="panel">
            <h2>Vendas entregues: {money(view.data.sales_cents)}</h2>
            <p>
              {view.data.orders_count} pedidos pela data efetiva de
              entrega/retirada.
            </p>
            <p>
              Recebido líquido no período: {money(view.data.received_cents)}{' '}
              (cliente/período; dinheiro não alocado não tem condição de
              pedido).
            </p>
            <p>
              A receber atual: {money(view.data.receivable_cents)} · posição{' '}
              {civilDate(view.data.position_day)}. O filtro de datas limita
              vendas e recebimentos, não reconstrói saldos históricos.
            </p>
          </section>
          <section className="panel">
            <h2>Comparação com período anterior</h2>
            <p>
              {civilDate(view.data.comparison.from)} a{' '}
              {civilDate(view.data.comparison.to)}:{' '}
              {money(view.data.comparison.sales_cents)} · diferença{' '}
              {money(view.data.comparison.change_cents)}
              {view.data.comparison.change_percent === null
                ? ' · sem base anterior para percentual'
                : ` · ${view.data.comparison.change_percent.toLocaleString('pt-BR')}%`}
            </p>
            <h3>Semana a semana</h3>
            {view.data.weekly.map((w) => (
              <p key={w.week}>
                Semana de {civilDate(w.week)}: {w.orders} pedidos ·{' '}
                {money(w.total_cents)}
              </p>
            ))}
          </section>
          <section className="panel">
            <h2>Clientes sem novas entregas no período</h2>
            {view.data.without_deliveries.map((c) => (
              <p key={c.id}>
                {c.name} · última entrega anterior em{' '}
                {civilDate(c.last_delivery)}
              </p>
            ))}
            <p>
              Indicador baseado em entregas registradas; não afirma abandono nem
              ausência de pedidos futuros.
            </p>
          </section>
          <section className="panel">
            <h2>Ranking de clientes</h2>
            {view.data.customers.map((c) => (
              <p key={c.id}>
                {c.name} · {c.orders} {c.orders === 1 ? 'pedido' : 'pedidos'} ·{' '}
                {money(c.total_cents)}
              </p>
            ))}
          </section>
          <section className="panel">
            <h2>Ranking de produtos / sabores</h2>
            <p className="muted">
              Ranking por unidades. O valor de uma caixa mista é rateado pelos
              sabores conforme as unidades de cada um. Não é preço avulso.
            </p>
            {view.data.products.map((p, i) => (
              <p key={i}>
                {p.display_name} · {p.weight_grams} g · capacidade{' '}
                {p.units_per_box}:{' '}
                <strong>
                  {p.units} {p.units === 1 ? 'unidade' : 'unidades'}
                </strong>{' '}
                {p.boxes > 0 && (
                  <>
                    {' '}
                    · {p.boxes} {p.boxes === 1 ? 'caixa' : 'caixas'} de um sabor
                  </>
                )}
                {p.mixed_units > 0 && (
                  <>
                    {' '}
                    · {p.mixed_units}{' '}
                    {p.mixed_units === 1 ? 'unidade' : 'unidades'} em caixas
                    mistas
                  </>
                )}{' '}
                ·{' '}
                {(p.units / p.units_per_box).toLocaleString('pt-BR', {
                  maximumFractionDigits: 4,
                })}{' '}
                caixas equivalentes · vendas atribuídas: {money(p.total_cents)}
              </p>
            ))}
          </section>
          <section className="panel">
            <h2>Vendas por condição</h2>
            {view.data.conditions.map((c) => (
              <p key={c.mode}>
                {c.mode === 'credit'
                  ? 'A prazo'
                  : c.mode === 'delivery'
                    ? 'Na entrega'
                    : c.mode === 'advance'
                      ? 'Adiantado'
                      : 'A definir'}{' '}
                · {money(c.total_cents)}
              </p>
            ))}
          </section>
          <section className="panel">
            <h2>Contas a receber / aging atual</h2>
            {view.data.aging.map((o) => (
              <p key={o.order_id}>
                {o.customer_name} ·{' '}
                {o.due_on ? civilDate(o.due_on) : 'Vencimento a definir'} ·{' '}
                {money(o.balance_cents)} · {o.bucket}
              </p>
            ))}
          </section>
        </>
      )}
      <p>
        Relatórios privados. CSV protegido contra fórmulas; exporte somente para
        destino autorizado. Vendas, recebido, saldo e lucro são conceitos
        diferentes; nenhum lucro é inferido aqui.
      </p>
    </>
  );
}

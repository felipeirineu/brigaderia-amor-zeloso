import { ChoiceChips } from '../../components/ChoiceChips';
import { Button } from '../../components/Button';
import { useState } from 'react';
import { useRemote, Failure, localDay } from '../operations/common';
import { money, civilDate } from '../api';
import { privateDownload } from '../PrivateDownload';
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
    boxes: number;
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
export function Reports() {
  const [from, setFrom] = useState(() => localDay().slice(0, 8) + '01'),
    [to, setTo] = useState(localDay),
    [condition, setCondition] = useState('all'),
    [customer, setCustomer] = useState(''),
    [kind, setKind] = useState('orders'),
    [error, setError] = useState('');
  const query = `from=${from}&to=${to}&condition=${condition}${customer ? '&customer=' + customer : ''}`,
    view = useRemote<Report>('p1/reports?' + query),
    customers = useRemote<{ id: string; name: string }[]>(
      'customers?active=all',
    );
  return (
    <>
      <h1 className="mobile-context-title">Relatórios</h1>
      <Failure message={error || view.error || customers.error} />
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
          options={[
            ['all', 'Todas'],
            ['unset', 'A definir'],
            ['advance', 'Adiantado'],
            ['delivery', 'Na entrega'],
            ['credit', 'A prazo'],
          ]}
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
        <label>
          Exportar dados
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="orders">Pedidos vendidos</option>
            <option value="customers">Vendas por cliente</option>
            <option value="products">Vendas por produto/sabor</option>
            <option value="aging">Contas a receber atual</option>
            <option value="weeks">Semana a semana</option>
            <option value="without_deliveries">
              Clientes sem entregas no período
            </option>
          </select>
        </label>
        <Button
          onClick={() =>
            void privateDownload(
              'p1/reports.csv?' + query + '&kind=' + kind,
              'relatorio-' + kind + '.csv',
            ).catch((e) => setError(e.message))
          }
        >
          Exportar relatório CSV
        </Button>
      </div>
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
                {c.name} · {c.orders} pedidos · {money(c.total_cents)}
              </p>
            ))}
          </section>
          <section className="panel">
            <h2>Ranking de produtos / sabores</h2>
            {view.data.products.map((p, i) => (
              <p key={i}>
                {p.name} — {p.variant}: {p.boxes} embalagens · {p.units}{' '}
                unidades · {money(p.total_cents)}
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

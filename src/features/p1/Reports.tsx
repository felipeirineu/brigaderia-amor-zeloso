import { useState } from 'react';
import { useRemote, Failure, localDay } from '../operations/common';
import { money, civilDate } from '../api';
import { privateDownload } from '../PrivateDownload';
interface Report {
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
      <h1>Relatórios</h1>
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
        <label>
          Condição das vendas
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            <option value="all">Todas</option>
            <option value="unset">A definir</option>
            <option value="advance">Adiantado</option>
            <option value="delivery">Na entrega</option>
            <option value="credit">A prazo</option>
          </select>
        </label>
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
          </select>
        </label>
        <button
          onClick={() =>
            void privateDownload(
              'p1/reports.csv?' + query + '&kind=' + kind,
              'relatorio-' + kind + '.csv',
            ).catch((e) => setError(e.message))
          }
        >
          Exportar relatório CSV
        </button>
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

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, dateTime } from '../api';
import {
  useRemote,
  Failure,
  localDay,
  type OperationalOrder,
} from '../operations/common';
import { TravelSheet } from './TravelSheet';
import { travelModes, travelLegs } from '../../../shared/field';
import { privateDownload } from '../PrivateDownload';
interface Trip {
  id: string;
  mode: keyof typeof travelModes;
  leg: keyof typeof travelLegs;
  occurred_at: string;
  amount_cents: number;
  can_reverse: boolean;
  reversed: number;
  reversal_of: string | null;
  notes: string;
  orders: { order_id: string; allocated_cents: number }[];
}
export function Travel() {
  const [from, setFrom] = useState(() => localDay().slice(0, 8) + '01'),
    [to, setTo] = useState(localDay),
    [show, setShow] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [undo, setUndo] = useState(''),
    [reason, setReason] = useState(''),
    view = useRemote<Trip[]>(`field/trips?from=${from}&to=${to}`),
    orders = useRemote<OperationalOrder[]>('orders');
  async function reverse() {
    setBusy(true);
    setError('');
    try {
      await api(
        `field/trips/${undo}/reverse`,
        'POST',
        { reason },
        crypto.randomUUID(),
      );
      setUndo('');
      setReason('');
      await view.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Deslocamentos</h1>
      <p>
        Custos pagos de entrega. Correções geram estorno; registre o valor
        correto em novo lançamento.
      </p>
      <label>
        De
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label>
        Até
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </label>
      <Failure message={error || view.error || orders.error} />
      <button disabled={!orders.data?.length} onClick={() => setShow(true)}>
        Registrar deslocamento
      </button>
      {show && (
        <TravelSheet
          orders={orders.data!.filter((o) => o.status !== 'cancelled')}
          onClose={() => setShow(false)}
          onSaved={() => void view.refresh()}
        />
      )}
      <p>
        Lista de seleção: até 200 pedidos recentes; pedidos antigos podem ser
        abertos individualmente pela lista de pedidos.
      </p>
      {view.data?.map((t) => (
        <article key={t.id} className="panel">
          <h2>
            {travelModes[t.mode]} · {travelLegs[t.leg]}
          </h2>
          <p>
            {dateTime(t.occurred_at)} · {money(t.amount_cents)}{' '}
            {t.reversed ? '· Estornado' : t.reversal_of ? '· Compensação' : ''}
          </p>
          <p>{t.notes}</p>
          {t.orders.map((o) => (
            <p key={o.order_id}>
              <Link to={'/gestao/pedidos/' + o.order_id}>Ver pedido</Link> ·
              Rateio estimado {money(o.allocated_cents)}
            </p>
          ))}
          {t.can_reverse && (
            <button onClick={() => setUndo(t.id)}>Estornar deslocamento</button>
          )}
        </article>
      ))}
      {undo && (
        <section className="panel">
          <h2>Estornar deslocamento</h2>
          <label>
            Motivo do estorno
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            disabled={busy || reason.trim().length < 3}
            onClick={() => void reverse()}
          >
            Confirmar estorno
          </button>
          <button onClick={() => setUndo('')}>Cancelar</button>
        </section>
      )}
      <TravelReport from={from} to={to} />
    </>
  );
}
export function TravelReport({ from, to }: { from: string; to: string }) {
  const view = useRemote<{
      total_cents: number;
      customers: {
        id: string;
        name: string;
        cost_cents: number;
        revenue_cents: number;
        percent: number | null;
      }[];
    }>(`field/travel-report?from=${from}&to=${to}`),
    [error, setError] = useState('');
  return (
    <section className="panel">
      <h2>Custo das entregas</h2>
      <Failure message={view.error || error} />
      <p>
        Rateio estimado, proporcional ao valor dos pedidos em cada corrida.
        Custos pela data do deslocamento; faturamento dos pedidos
        entregues/retirados combinados no período. Datas diferentes podem
        distorcer o percentual. Não representa lucro líquido.
      </p>
      <p>Total de deslocamentos ativos: {money(view.data?.total_cents ?? 0)}</p>
      <button
        onClick={() =>
          void privateDownload(
            `field/travel-report?from=${from}&to=${to}&format=csv`,
            'deslocamentos.csv',
          ).catch((e) => setError(e.message))
        }
      >
        Exportar custo de entrega CSV
      </button>
      {view.data?.customers.map((c) => (
        <p key={c.id}>
          {c.name}: {money(c.cost_cents)} de corrida / {money(c.revenue_cents)}{' '}
          de pedidos ·{' '}
          {c.percent === null
            ? 'Sem faturamento no período'
            : c.percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) +
              '% do faturamento em corrida'}
        </p>
      ))}
    </section>
  );
}

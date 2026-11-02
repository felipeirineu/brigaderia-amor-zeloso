import { useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { api, dateTime, money } from '../api';
import { Failure, type OperationalOrder } from './common';
export function PendingConfirmations({
  orders,
  truncated,
  onChanged,
}: {
  orders: OperationalOrder[];
  truncated: boolean;
  onChanged: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [results, setResults] = useState<
      { id: string; ok: boolean; error?: string }[]
    >([]);
  const pending = useRef(false),
    keys = useRef(new Map<string, string>());
  async function confirm() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setResults([]);
    try {
      const chosen = orders
        .filter((o) => selected[o.id])
        .map((o) => {
          const snapshot = o.id + ':' + o.version;
          if (!keys.current.has(snapshot))
            keys.current.set(snapshot, crypto.randomUUID());
          return {
            id: o.id,
            version: o.version,
            key: keys.current.get(snapshot)!,
          };
        });
      const done: typeof results = [];
      for (let i = 0; i < chosen.length; i += 3) {
        const r = await api<{ results: typeof results }>(
          'confirm-reviewed',
          'POST',
          { orders: chosen.slice(i, i + 3) },
        );
        done.push(...r.results);
        setResults([...done]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSelected({});
      await onChanged().catch(() =>
        setError(
          'Não foi possível atualizar. Confira os pedidos antes de tentar novamente.',
        ),
      );
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="panel pending-confirmations">
      <h3>Pedidos para confirmar</h3>
      <Failure message={error} />
      {truncated && (
        <p role="alert">
          Há mais de 50 pendências. Confira as demais em Pedidos.
        </p>
      )}
      {orders.length === 0 ? (
        <p>Tudo confirmado.</p>
      ) : (
        <>
          <p>Confira os itens e marque os pedidos revisados.</p>
          {orders.map((o) => (
            <article key={o.id}>
              <label>
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={!!selected[o.id]}
                  onChange={(e) =>
                    setSelected({ ...selected, [o.id]: e.target.checked })
                  }
                />{' '}
                Revisei pedido de {o.customer_name}
              </label>
              <p>
                {dateTime(o.due_at)} · {money(o.total_cents)}
              </p>
              <ul>
                {o.items.map((i) => (
                  <li key={i.variant_id}>
                    {i.quantity}× {i.product_name} · {i.variant_label}
                  </li>
                ))}
              </ul>
              <Button to={`/gestao/pedidos/${o.id}`} variant="ghost">
                Revisar pedido de {o.customer_name}
              </Button>
            </article>
          ))}
          <Button
            variant="primary"
            loading={busy}
            disabled={busy || !orders.some((o) => selected[o.id])}
            onClick={() => void confirm()}
          >
            Confirmar todos os revisados (
            {orders.filter((o) => selected[o.id]).length})
          </Button>
        </>
      )}
      {results.map((r) => (
        <p key={r.id} role={r.ok ? 'status' : 'alert'}>
          {orders.find((o) => o.id === r.id)?.customer_name ??
            'Pedido ' + r.id.slice(0, 8)}
          : {r.ok ? 'confirmado' : r.error}
        </p>
      ))}
    </section>
  );
}

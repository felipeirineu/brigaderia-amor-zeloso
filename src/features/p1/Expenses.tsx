import { MoneyField } from '../../components/NumericInputs';
import { useRef, useState } from 'react';
import { useRemote, Failure, localDay } from '../operations/common';
import { api, money, parsePrice, civilDate } from '../api';
import { privateDownload } from '../PrivateDownload';
import { paymentMethods } from '../../../shared/finance';
const categories = {
  ingredients: 'Ingredientes',
  packaging: 'Embalagens',
  delivery: 'Entregas',
  utilities: 'Contas e serviços',
  labor: 'Mão de obra',
  other: 'Outro',
};
export function Expenses() {
  const [from, setFrom] = useState(() => localDay().slice(0, 8) + '01'),
    [to, setTo] = useState(localDay),
    [amount, setAmount] = useState(''),
    [description, setDescription] = useState(''),
    [category, setCategory] = useState('other'),
    [method, setMethod] = useState('cash'),
    [day, setDay] = useState(localDay),
    [order, setOrder] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    request = useRef({ body: '', key: crypto.randomUUID() }),
    pending = useRef(false);
  const query = `from=${from}&to=${to}`,
    view = useRemote<{
      role: string;
      opening_cents: number;
      received_cents: number;
      spent_cents: number;
      net_cents: number;
      closing_cents: number;
      events: {
        id: string;
        kind: string;
        amount_cents: number;
        category: keyof typeof categories;
        description: string;
        method: keyof typeof paymentMethods;
        spent_on: string;
        reason: string;
        reversed: number;
      }[];
      daily: { day: string; received_cents: number; spent_cents: number }[];
    }>('p1/expenses?' + query),
    orders = useRemote<{ id: string; customer_name: string }[]>('orders');
  async function run(path: string, data: object) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const signature = path + JSON.stringify(data);
    if (request.current.body !== signature)
      request.current = { body: signature, key: crypto.randomUUID() };
    try {
      await api(path, 'POST', data, request.current.key);
      await view.refresh();
      setAmount('');
      setDescription('');
      setNotice(
        'Evento registrado. Nenhum pagamento foi realizado pelo aplicativo.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Despesas e fluxo de caixa</h1>
      <Failure message={error || view.error || orders.error} />
      <p role="status">{notice}</p>
      <div className="data-form panel">
        <label>
          Fluxo de
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
          Fluxo até
          <input
            type="date"
            required
            value={to}
            onChange={(e) => {
              if (e.target.value) setTo(e.target.value);
            }}
          />
        </label>
        <button
          onClick={() =>
            void privateDownload(
              'p1/cashflow.csv?' + query,
              'fluxo-registrado.csv',
            ).catch((e) => setError(e.message))
          }
        >
          Exportar fluxo CSV
        </button>
      </div>
      {view.data && (
        <>
          <section className="panel">
            <h2>Fluxo registrado</h2>
            <p>Acumulado antes do período: {money(view.data.opening_cents)}</p>
            <p>
              Recebido líquido: {money(view.data.received_cents)} · despesas
              líquidas: {money(view.data.spent_cents)}
            </p>
            <p>
              Fluxo líquido no período: {money(view.data.net_cents)} · acumulado
              registrado: {money(view.data.closing_cents)}
            </p>
            <p>
              Registros informados pela equipe; não é saldo bancário ou lucro.
              Créditos recebidos entram uma vez; alocá-los não movimenta caixa.
            </p>
          </section>
          {view.data.role === 'owner' && (
            <form
              className="panel data-form"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const cents = parsePrice(amount);
                  if (
                    confirm(
                      'Registrar esta despesa já realizada? Isso não paga ou transfere dinheiro.',
                    )
                  )
                    void run('p1/expenses', {
                      amount_cents: cents,
                      category,
                      description,
                      method,
                      spent_on: day,
                      order_id: order || null,
                    });
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <h2>Registrar despesa realizada</h2>
              <label>
                Valor da despesa (R$)
                <MoneyField
                  required
                  value={amount}
                  onValueChange={(value) => setAmount(value)}
                />
              </label>
              <label>
                Categoria
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {Object.entries(categories).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Descrição da despesa
                <textarea
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label>
                Forma da despesa
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  {Object.entries(paymentMethods).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Dia da despesa
                <input
                  type="date"
                  required
                  max={localDay()}
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                />
              </label>
              <label>
                Pedido vinculado (opcional)
                <select
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                >
                  <option value="">Sem vínculo</option>
                  {orders.data?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.customer_name} · {o.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={busy}>Registrar despesa</button>
              <p>
                Taxa de motoboy não vira despesa automaticamente: confirme
                valor, data e vínculo antes de registrar.
              </p>
            </form>
          )}
          <section className="panel">
            <h2>Movimentos por dia</h2>
            {view.data.daily.map((d) => (
              <p key={d.day}>
                {civilDate(d.day)} · recebido {money(d.received_cents)} ·
                despesas {money(d.spent_cents)} · fluxo{' '}
                {money(d.received_cents - d.spent_cents)}
              </p>
            ))}
          </section>
          {view.data.events.map((e) => (
            <article className="panel" key={e.id}>
              <h2>
                {e.kind === 'reversal' ? 'Estorno de despesa' : 'Despesa'} ·{' '}
                {money(e.amount_cents)}
              </h2>
              <p>
                {civilDate(e.spent_on)} · {categories[e.category]} ·{' '}
                {paymentMethods[e.method]}
              </p>
              <p>
                {e.description} {e.reason}
              </p>
              {e.reversed > 0 && <p>Estornada; original preservado.</p>}
              {view.data!.role === 'owner' &&
                e.kind === 'expense' &&
                !e.reversed && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      const reason = prompt('Motivo do estorno da despesa:');
                      if (
                        reason?.trim() &&
                        confirm(
                          'Registrar estorno integral? O original será mantido.',
                        )
                      )
                        void run('p1/expenses/' + e.id, { reason });
                    }}
                  >
                    Estornar despesa {e.id.slice(0, 8)}
                  </button>
                )}
            </article>
          ))}
        </>
      )}
    </>
  );
}

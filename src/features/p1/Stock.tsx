import { Button } from '../../components/Button';
import { useState } from 'react';

import { Failure, useRemote, localDay } from '../operations/common';
import { useP1Save } from './useP1Save';
import { parseMilli, quantityInput, unitName } from './quantity';
import { QuantityField } from '../../components/NumericInputs';
interface StockItem {
  id: string;
  name: string;
  unit: string;
  active: number;
  balance_milli: number;
  minimum_milli: number | null;
  version: number;
}
interface Event {
  id: string;
  kind: string;
  delta_milli: number;
  reason: string;
  lot: string;
  expires_on: string | null;
  created_at: string;
  can_reverse: boolean;
  reversed: number;
}
const labels: Record<string, string> = {
  entry: 'Entrada',
  consumption: 'Consumo',
  loss: 'Perda',
  adjustment: 'Ajuste',
  reversal: 'Estorno',
};
export function Stock({ role }: { role: string }) {
  const view = useRemote<StockItem[]>('p1/inventory'),
    [id, setId] = useState('');
  return (
    <>
      <h1 className="mobile-context-title">Estoque</h1>
      <Button to="/gestao/insumos" variant="ghost">
        Cadastrar insumos e embalagens
      </Button>
      <p>
        Movimentos manuais na unidade do insumo. A previsão de produção não
        baixa estoque nem cria despesas.
      </p>
      <Failure message={view.error} />
      {view.data?.map((s) => (
        <article className="panel" key={s.id}>
          <h2>{s.name}</h2>
          <p>
            Saldo {quantityInput(s.balance_milli)} {unitName(s.unit)} ·{' '}
            {s.minimum_milli === null
              ? 'Mínimo não configurado'
              : 'Mínimo ' +
                quantityInput(s.minimum_milli) +
                ' ' +
                unitName(s.unit)}
          </p>
          {s.minimum_milli !== null && s.balance_milli < s.minimum_milli && (
            <p role="alert">Abaixo do mínimo</p>
          )}
          <Button onClick={() => setId(s.id)}>
            {s.active ? 'Movimentar e ver histórico' : 'Ver histórico'} de{' '}
            {s.name}
          </Button>
          {id === s.id && (
            <StockEditor key={id} item={s} role={role} refresh={view.refresh} />
          )}
        </article>
      ))}
    </>
  );
}
function StockEditor({
  item: s,
  role,
  refresh,
}: {
  item: StockItem;
  role: string;
  refresh: () => Promise<void>;
}) {
  const [kind, setKind] = useState('entry'),
    [quantity, setQuantity] = useState(''),
    [direction, setDirection] = useState('in'),
    [reason, setReason] = useState(''),
    [minimum, setMinimum] = useState(
      s.minimum_milli === null ? '' : quantityInput(s.minimum_milli),
    ),
    [lot, setLot] = useState(''),
    [expires, setExpires] = useState(''),
    [from, setFrom] = useState(() => localDay().slice(0, 8) + '01'),
    [to, setTo] = useState(localDay),
    history = useRemote<Event[]>(`p1/inventory/${s.id}?from=${from}&to=${to}`),
    save = useP1Save(async () => {
      await refresh();
      await history.refresh();
    });
  function move() {
    try {
      const n = parseMilli(quantity);
      if (n <= 0) throw Error('Informe quantidade positiva.');
      void save.save(
        'p1/inventory/' + s.id,
        {
          action: 'move',
          version: s.version,
          kind,
          delta_milli:
            (kind === 'entry' || (kind === 'adjustment' && direction === 'in')
              ? 1
              : -1) * n,
          reason,
          lot,
          expires_on: expires || null,
        },
        'POST',
        () => {
          setQuantity('');
          setReason('');
        },
      );
    } catch (e) {
      save.setError((e as Error).message);
    }
  }
  return (
    <section>
      <Failure message={save.error || history.error} />
      {save.notice && <p role="status">Movimento salvo com histórico.</p>}
      {!!s.active && (
        <>
          <div className="chips" aria-label="Tipo de movimento">
            {['entry', 'consumption', 'loss', 'adjustment'].map((k) => (
              <Button
                key={k}
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
              >
                {labels[k]}
              </Button>
            ))}
          </div>
          {s.unit === 'unit' ? (
            <QuantityField
              label="Quantidade do movimento"
              value={quantity}
              onValueChange={setQuantity}
            />
          ) : (
            <label>
              Quantidade do movimento ({unitName(s.unit)})
              <input
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Até três casas decimais"
              />
            </label>
          )}
          {kind === 'adjustment' && (
            <div className="chips">
              <Button
                aria-pressed={direction === 'in'}
                onClick={() => setDirection('in')}
              >
                Adicionar ao saldo
              </Button>
              <Button
                aria-pressed={direction === 'out'}
                onClick={() => setDirection('out')}
              >
                Retirar do saldo
              </Button>
            </div>
          )}
          <label>
            Motivo do movimento ou estorno
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
          </label>
          <label>
            Lote (opcional)
            <input
              value={lot}
              onChange={(e) => setLot(e.target.value)}
              maxLength={100}
            />
          </label>
          <label>
            Validade (opcional)
            <input
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </label>
          <Button
            disabled={save.busy || reason.trim().length < 3 || !quantity}
            onClick={move}
            variant="primary"
            loading={save.busy}
          >
            Salvar movimento
          </Button>
          {role === 'owner' && (
            <>
              <label>
                Estoque mínimo ({unitName(s.unit)})
                <input
                  inputMode="decimal"
                  value={minimum}
                  onChange={(e) => setMinimum(e.target.value)}
                  placeholder="Sem mínimo cadastrado"
                />
              </label>
              <Button
                disabled={save.busy}
                onClick={() => {
                  try {
                    void save.save(
                      'p1/inventory/' + s.id,
                      {
                        action: 'minimum',
                        version: s.version,
                        minimum_milli:
                          minimum === '' ? null : parseMilli(minimum),
                      },
                      'POST',
                    );
                  } catch (e) {
                    save.setError((e as Error).message);
                  }
                }}
                variant="primary"
                loading={save.busy}
              >
                Salvar mínimo
              </Button>
            </>
          )}
        </>
      )}
      <h3>Histórico</h3>
      <label>
        Desde
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
      {history.data?.map((e) => (
        <div key={e.id}>
          <p>
            {labels[e.kind]} · {quantityInput(e.delta_milli)} {unitName(s.unit)}{' '}
            · {e.reason} {e.reversed ? '· Estornado' : ''}
          </p>
          {e.lot && (
            <p>
              Lote: {e.lot} {e.expires_on ? '· Validade ' + e.expires_on : ''}
            </p>
          )}
          {e.can_reverse && (
            <Button
              disabled={save.busy || reason.trim().length < 3}
              onClick={() =>
                void save.save(
                  'p1/inventory/' + s.id,
                  {
                    action: 'reverse',
                    version: s.version,
                    event_id: e.id,
                    reason,
                  },
                  'POST',
                  () => setReason(''),
                )
              }
              variant="danger"
              loading={save.busy}
            >
              Estornar este movimento
            </Button>
          )}
        </div>
      ))}
      <p>
        Lote/validade são anotações do movimento. O saldo é agregado; confira o
        lote físico antes de consumir.
      </p>
    </section>
  );
}

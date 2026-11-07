import { useState } from 'react';
import { Button } from '../../components/Button';
import { DisclosureSummary } from '../../components/DisclosureSummary';
import { Failure, useRemote } from '../operations/common';
import { money } from '../api';
interface Cost {
  estimated_cost_cents: number | null;
  missing: string[];
  items: {
    item_id: string;
    quantity: number;
    mixed: boolean;
    estimated_cost_cents: number | null;
    components: {
      variant_id: string;
      name: string;
      units: number;
      unit_cost_cents: number | null;
      estimated_cost_cents: number | null;
    }[];
  }[];
}
function CostDetails({ id, version }: { id: string; version: number }) {
  const view = useRemote<Cost>(`p1/order-costs/${id}?version=${version}`);
  return (
    <>
      <Failure message={view.error} />
      {!view.data && !view.error && <p role="status">Calculando estimativa…</p>}
      {view.data && (
        <>
          <p>
            Fichas e custos atuais. O custo unitário da ficha é arredondado para
            cima e multiplicado pelas unidades de cada sabor.
          </p>
          <h3>
            {view.data.estimated_cost_cents === null
              ? 'Custo indisponível'
              : 'Custo estimado: ' + money(view.data.estimated_cost_cents)}
          </h3>
          {view.data.missing.length > 0 && (
            <div role="alert">
              <ul>
                {view.data.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <Button to="/gestao/fichas" variant="ghost">
                Conferir fichas técnicas
              </Button>
            </div>
          )}
          {view.data.items.map((item) => (
            <article key={item.item_id} className="order-cost-item">
              <h4>
                {item.quantity} {item.quantity === 1 ? 'caixa' : 'caixas'}{' '}
                {item.mixed
                  ? 'mista' + (item.quantity === 1 ? '' : 's')
                  : 'de um sabor'}{' '}
                ·{' '}
                {item.estimated_cost_cents === null
                  ? 'custo indisponível'
                  : money(item.estimated_cost_cents)}
              </h4>
              <ul>
                {item.components.map((c) => (
                  <li key={c.variant_id}>
                    {c.name}: {c.units} {c.units === 1 ? 'unidade' : 'unidades'}{' '}
                    ·{' '}
                    {c.estimated_cost_cents === null
                      ? 'custo indisponível'
                      : money(c.estimated_cost_cents)}
                  </li>
                ))}
              </ul>
            </article>
          ))}
          <p>
            Somente produção: entrega e outras despesas ficam fora. A lista de
            compras considera lotes inteiros e embalagens de compra; por isso
            pode ter outro valor. Não é lucro apurado.
          </p>
          <Button variant="ghost" onClick={() => void view.refresh()}>
            Atualizar estimativa
          </Button>
        </>
      )}
    </>
  );
}
export function OrderCost({ id, version }: { id: string; version: number }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="panel order-cost"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <DisclosureSummary>Custo estimado do pedido</DisclosureSummary>
      {open && <CostDetails id={id} version={version} />}
    </details>
  );
}

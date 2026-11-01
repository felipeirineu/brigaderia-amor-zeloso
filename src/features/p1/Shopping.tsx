import { Button } from '../../components/Button';
import { useState } from 'react';

import { Failure, useRemote, localDay } from '../operations/common';
import { money, civilDate } from '../api';
import { quantityInput, unitName } from './quantity';
export function Shopping() {
  const [from, setFrom] = useState(localDay),
    [to, setTo] = useState(localDay),
    view = useRemote<{
      missing: string[];
      estimated_purchase_cents: number | null;
      batches: {
        recipe_id: string;
        name: string;
        needed_units: number;
        batches: number;
        produced_units: number;
      }[];
      items: {
        supply_id: string;
        name: string;
        unit: string;
        required_milli: number;
        packs: number;
        estimated_purchase_cents: number | null;
      }[];
    }>(`p1/shopping?from=${from}&to=${to}`);
  return (
    <>
      <h1>Lista de compras</h1>
      <Button to="/gestao/fichas" variant="ghost">
        Conferir fichas técnicas
      </Button>
      <Failure message={view.error} />
      <div className="panel data-form">
        <label>
          Produção de
          <input
            type="date"
            value={from}
            onChange={(e) => {
              if (e.target.value) setFrom(e.target.value);
            }}
          />
        </label>
        <label>
          Produção até
          <input
            type="date"
            value={to}
            onChange={(e) => {
              if (e.target.value) setTo(e.target.value);
            }}
          />
        </label>
      </div>
      <p>
        Pedidos confirmados e em produção com prazo entre {civilDate(from)} e{' '}
        {civilDate(to)}. Arredonda lotes inteiros por variante e embalagens de
        compra para cima. Confira estoque manualmente antes de comprar.
      </p>
      {view.data && (
        <>
          {view.data.missing.length > 0 && (
            <section className="panel" role="alert">
              <h2>Planejamento incompleto</h2>
              <ul>
                {view.data.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </section>
          )}
          <section className="panel">
            <h2>Lotes necessários</h2>
            {view.data.batches.length === 0 && (
              <p>Nenhum lote calculável no período.</p>
            )}
            {view.data.batches.map((b) => (
              <p key={b.recipe_id}>
                {b.name} · pedido {b.needed_units} unidades · {b.batches}{' '}
                lote(s) · produção estimada {b.produced_units} unidades
              </p>
            ))}
          </section>
          <section className="panel">
            <h2>Insumos / embalagens</h2>
            {view.data.items.map((s) => (
              <article key={s.supply_id}>
                <h3>{s.name}</h3>
                <p>
                  Necessidade: {quantityInput(s.required_milli)}{' '}
                  {unitName(s.unit)} · comprar até {s.packs} embalagem(ns) antes
                  de descontar o estoque manualmente.
                </p>
                <p>
                  {s.estimated_purchase_cents === null
                    ? 'Preço/custo pendente'
                    : `Estimativa de compra: ${money(s.estimated_purchase_cents)}`}
                </p>
              </article>
            ))}
            <p>
              Total estimado:{' '}
              {view.data.estimated_purchase_cents === null
                ? 'incompleto, confira as pendências'
                : money(view.data.estimated_purchase_cents)}
            </p>
          </section>
        </>
      )}
      <p>
        Planejamento somente: não compra, não cria despesa e não movimenta
        estoque. Não inclui ingredientes de produtos sem ficha.
      </p>
    </>
  );
}

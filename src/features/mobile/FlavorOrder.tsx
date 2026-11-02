import { DisclosureSummary } from '../../components/DisclosureSummary';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { flavorOrderKey, readFlavorOrder } from './flavorOrder';
export function FlavorOrder({
  products,
}: {
  products: { id: string; name: string; photo_key?: string | null }[];
}) {
  const [saved, setSaved] = useState(readFlavorOrder),
    ids = [
      ...saved.filter((id) => products.some((p) => p.id === id)),
      ...products
        .filter((p) => !saved.includes(p.id))
        .sort(
          (a, b) =>
            Number(b.photo_key === 'tradicional') -
            Number(a.photo_key === 'tradicional'),
        )
        .map((p) => p.id),
    ];
  function move(i: number, d: number) {
    const next = [...ids];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    localStorage.setItem(flavorOrderKey, JSON.stringify(next));
    setSaved(next);
    window.dispatchEvent(new Event('flavor-order'));
  }
  return (
    <details className="panel">
      <DisclosureSummary>Ordem dos sabores neste navegador</DisclosureSummary>
      <p>
        Desempata sabores com o mesmo número de pedidos. Salva somente a
        preferência de ordem, sem nomes, preços ou clientes. Não sincroniza
        entre aparelhos.
      </p>
      {ids.map((id, i) => (
        <div className="actions" key={id}>
          <span>{products.find((p) => p.id === id)?.name}</span>
          <Button
            type="button"
            disabled={i === 0}
            aria-label={'Subir ' + products.find((p) => p.id === id)?.name}
            onClick={() => move(i, -1)}
          >
            Subir
          </Button>
          <Button
            type="button"
            disabled={i === ids.length - 1}
            aria-label={'Descer ' + products.find((p) => p.id === id)?.name}
            onClick={() => move(i, 1)}
          >
            Descer
          </Button>
        </div>
      ))}
    </details>
  );
}

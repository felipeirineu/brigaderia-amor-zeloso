import { useState } from 'react';
import { useField } from './FieldContext';
import {
  useRemote,
  Failure,
  type OperationalOrder,
} from '../operations/common';
import { transportLinks, distance, type Place } from '../../../shared/field';
import { emptyPlace } from '../../../shared/field';
function Buttons({ place, base = false }: { place: Place; base?: boolean }) {
  const [message, setMessage] = useState(''),
    links = transportLinks(place);
  return (
    <div className="actions">
      <a className="button" href={links.uber} target="_blank" rel="noreferrer">
        {base ? 'Voltar para a base' : 'Abrir Uber'}
      </a>
      {!base && (
        <>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard
                .writeText(place.address)
                .then(() => setMessage('Endereço copiado: cole no destino'))
                .catch(() =>
                  setMessage(
                    'Não foi possível copiar. Copie o endereço mostrado acima.',
                  ),
                );
            }}
          >
            Copiar destino para 99
          </button>
          <a
            className="button"
            href="https://99app.com/"
            target="_blank"
            rel="noreferrer"
          >
            Abrir 99
          </a>
          <a
            className="button"
            href={links.maps}
            target="_blank"
            rel="noreferrer"
          >
            Maps
          </a>
          <a
            className="button"
            href={links.waze}
            target="_blank"
            rel="noreferrer"
          >
            Waze
          </a>
        </>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
function Destination({ order }: { order: OperationalOrder }) {
  const c = useField(),
    snapshot = useRemote<Place | null>(`field/orders/${order.id}`),
    place = snapshot.data ?? {
      ...emptyPlace(),
      name: order.customer_name,
      address: order.delivery_address,
    },
    km = c?.data ? distance(c.data.company.data, place) : null;
  return (
    <>
      <Failure message={snapshot.error} />
      {km !== null && (
        <p>
          ≈ {km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km em
          linha reta
        </p>
      )}
      <Buttons place={place} />
      {c?.data?.company.data.address && (
        <Buttons base place={c.data.company.data} />
      )}
      <p>
        Confira origem e destino no aplicativo. Nenhuma corrida é solicitada
        automaticamente.
      </p>
    </>
  );
}
export function Transport({ order }: { order: OperationalOrder }) {
  const c = useField();
  return c && order.delivery_address ? <Destination order={order} /> : null;
}

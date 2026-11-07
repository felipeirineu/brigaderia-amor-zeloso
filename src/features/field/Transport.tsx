import { Button } from '../../components/Button';
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
      <Button
        className="button"
        href={links.uber}
        target="_blank"
        rel="noreferrer"
      >
        {base ? 'Voltar para a base' : 'Abrir Uber'}
      </Button>
      {!base && (
        <>
          <Button
            type="button"
            onClick={() => {
              void navigator.clipboard
                .writeText(place.address)
                .then(() =>
                  setMessage(
                    'Endereço copiado. Abra o app da 99 e cole no destino.',
                  ),
                )
                .catch(() =>
                  setMessage(
                    'Não foi possível copiar. Copie o endereço mostrado acima.',
                  ),
                );
            }}
          >
            Copiar endereço para a 99
          </Button>
          <Button
            className="button"
            href={links.maps}
            target="_blank"
            rel="noreferrer"
          >
            Maps
          </Button>
          <Button
            className="button"
            href={links.waze}
            target="_blank"
            rel="noreferrer"
          >
            Waze
          </Button>
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

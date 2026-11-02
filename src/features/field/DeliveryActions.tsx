import { useRef, useState } from 'react';
import { RouteInfo } from './RouteInfo';
import {
  mapApps,
  readMapApp,
  rememberMapApp,
  type MapApp,
} from './map-preference';
import { Car, MapPin, MessageCircle, Navigation, Copy } from 'lucide-react';
import { Button } from '../../components/Button';
import { useField } from './FieldContext';
import { emptyPlace, transportLinks } from '../../../shared/field';
import type { OperationalOrder } from '../operations/common';
export function DeliveryActions({ order }: { order: OperationalOrder }) {
  const field = useField(),
    trigger = useRef<HTMLElement | null>(null),
    sheet = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState(''),
    [preferred, setPreferred] = useState<MapApp | null>(null);
  const user = field?.data?.user_id ?? '';
  function choose(app: MapApp) {
    rememberMapApp(user, app);
    setPreferred(app);
  }
  const place = field?.data?.order_places.find((p) => p.order_id === order.id)
    ?.data ?? {
    ...emptyPlace(),
    name: order.customer_name,
    address: order.delivery_address,
  };
  const links = transportLinks(place),
    destination =
      place.latitude !== null && place.longitude !== null
        ? `${place.latitude},${place.longitude}`
        : place.address;
  const available = order.delivery_type === 'delivery' && !!place.address;
  return (
    <>
      <div className="delivery-icon-row">
        <Button
          disabled={!available}
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            trigger.current = e.currentTarget;
            setPreferred(readMapApp(user));
            sheet.current?.showModal();
          }}
        >
          <MapPin size={22} aria-hidden="true" />
          Mapa
        </Button>
        <Button to={`/gestao/pedidos/${order.id}#whatsapp`}>
          <MessageCircle size={22} aria-hidden="true" />
          WhatsApp
        </Button>
        <Button
          href={links.uber}
          aria-label="Abrir Uber"
          target="_blank"
          rel="noreferrer"
          disabled={!available}
        >
          <Car size={22} aria-hidden="true" />
          Uber
        </Button>
        <Button
          disabled={!available}
          aria-label="Copiar destino para 99"
          onClick={() => {
            void navigator.clipboard
              .writeText(place.address)
              .then(() => setNotice('Endereço copiado. Cole no destino do 99.'))
              .catch(() =>
                setNotice(
                  'Não foi possível copiar. Abra Mapa para copiar o endereço.',
                ),
              );
          }}
        >
          <Car size={22} aria-hidden="true" />
          99
        </Button>
      </div>
      {notice && <p role="status">{notice}</p>}
      <dialog
        ref={sheet}
        className="help-sheet"
        aria-label={`Rota até ${order.customer_name}`}
        onClose={() => trigger.current?.focus()}
      >
        <div className="sheet-body">
          <h2>Rota até {order.customer_name}</h2>
          <p>{place.address}</p>
          <RouteInfo id={order.id} place={place} order />
          {preferred && (
            <p className="muted" role="status">
              Último usado: {mapApps[preferred]}. Escolha outro para trocar.
            </p>
          )}
          <p>
            A rota parte da localização atual no aplicativo escolhido. Confira o
            destino. Não rastreamos sua localização.
          </p>
          <div className="data-form">
            <Button
              href={links.maps + '&travelmode=driving'}
              data-preferred={preferred === 'google'}
              onClick={() => choose('google')}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation size={20} aria-hidden="true" />
              Google Maps
            </Button>
            <Button
              href={links.waze}
              target="_blank"
              rel="noreferrer"
              data-preferred={preferred === 'waze'}
              onClick={() => choose('waze')}
            >
              Waze
            </Button>
            <Button
              data-preferred={preferred === 'apple'}
              onClick={() => choose('apple')}
              href={`https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`}
              target="_blank"
              rel="noreferrer"
            >
              Mapas do iPhone
            </Button>
            <Button
              onClick={() => {
                void navigator.clipboard
                  .writeText(place.address)
                  .then(() => setNotice('Endereço copiado.'))
                  .catch(() =>
                    setNotice(
                      'Não foi possível copiar. Selecione o endereço acima.',
                    ),
                  );
              }}
            >
              <Copy size={20} aria-hidden="true" />
              Copiar endereço
            </Button>
            <Button onClick={() => sheet.current?.close()}>Fechar mapa</Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

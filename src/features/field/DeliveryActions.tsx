import { DeliveryMessageSheet } from './DeliveryMessageSheet';
import { useRef, useState } from 'react';
import { RouteInfo } from './RouteInfo';
import {
  appleMapsAvailable,
  mapApps,
  readMapApp,
  rememberMapApp,
  type MapApp,
} from './map-preference';
import { Car, MapPin, MessageCircle, Navigation, Copy } from 'lucide-react';
import { Button } from '../../components/Button';
import { useField } from './FieldContext';
import {
  emptyPlace,
  regionalAddress,
  transportLinks,
} from '../../../shared/field';
import type { OperationalOrder } from '../operations/common';
export function DeliveryActions({ order }: { order: OperationalOrder }) {
  const field = useField(),
    trigger = useRef<HTMLElement | null>(null),
    sheet = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState(''),
    [messageOpen, setMessageOpen] = useState(false),
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
  const routed = {
      ...place,
      address: regionalAddress(place.address, field?.data?.company.data.city),
    },
    links = transportLinks(routed),
    destination =
      place.latitude !== null && place.longitude !== null
        ? `${place.latitude},${place.longitude}`
        : routed.address;
  const available = order.delivery_type === 'delivery' && !!place.address;
  return (
    <>
      {messageOpen && (
        <DeliveryMessageSheet
          order={order}
          onClose={() => setMessageOpen(false)}
        />
      )}
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
        <Button
          {...(field
            ? { onClick: () => setMessageOpen(true) }
            : { to: `/gestao/pedidos/${order.id}#whatsapp` })}
        >
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
              .then(() =>
                setNotice(
                  'Endereço copiado. Abra o app da 99 e cole no destino.',
                ),
              )
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
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        onClose={() => trigger.current?.focus()}
      >
        <div className="sheet-body">
          <h2>Rota até {order.customer_name}</h2>
          <p>{place.address}</p>
          <p className="map-destination">
            {place.latitude !== null && place.longitude !== null
              ? 'Destino: 📍 localização guardada no cadastro. Se o endereço acima mudou, atualize a localização em Clientes.'
              : 'Destino: o endereço acima.'}
          </p>
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
            {appleMapsAvailable() && (
              <Button
                data-preferred={preferred === 'apple'}
                onClick={() => choose('apple')}
                href={`https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`}
                target="_blank"
                rel="noreferrer"
              >
                Mapas do iPhone
              </Button>
            )}
            <p className="map-hint">
              O Waze abre direto só se o app estiver instalado; sem ele, abre a
              página de download.
            </p>
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
            <Button
              className="sheet-close"
              onClick={() => sheet.current?.close()}
            >
              Fechar mapa
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

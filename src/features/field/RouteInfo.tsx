import { HelpTip } from '../../components/HelpTip';
import { useRef, useState } from 'react';
import { Car } from 'lucide-react';
import { Button } from '../../components/Button';
import { useField } from './FieldContext';
import { api, dateTime } from '../api';
import { distance, type Place } from '../../../shared/field';
export function RouteInfo({
  id,
  place,
  order = false,
}: {
  id: string;
  place?: Place;
  order?: boolean;
}) {
  const c = useField(),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    key = useRef(crypto.randomUUID());
  if (!c?.data) return null;
  const r = (order ? c.data.order_routes : c.data.routes)?.find(
      (r) => r.id === id,
    ),
    p = place ?? c.data.sites.find((s) => s.id === id)?.data,
    km = p ? distance(c.data.company.data, p) : null;
  return (
    <div className="route-info">
      {r ? (
        <p>
          <Car size={14} aria-hidden="true" />{' '}
          {r.route_km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km
          · {Math.ceil(r.route_minutes)} min de carro <HelpTip topic="route" />
          <small title={'Calculada em ' + dateTime(r.route_computed_at)}>
            <a
              href="https://openrouteservice.org/"
              target="_blank"
              rel="noreferrer"
            >
              © openrouteservice/HeiGIT
            </a>{' '}
            ·{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              OSM
            </a>
          </small>
        </p>
      ) : km !== null ? (
        <p>
          ≈ {km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km em
          linha reta
        </p>
      ) : null}
      {!order && c.data.role === 'owner' && (
        <Button
          variant="ghost"
          disabled={busy}
          loading={busy}
          onClick={() => {
            setBusy(true);
            setNotice('');
            void api<{ remaining: number }>(
              'field/routes/' + id,
              'POST',
              {},
              key.current,
            )
              .then((result) => {
                key.current = crypto.randomUUID();
                setNotice(
                  result.remaining
                    ? 'Há rotas pendentes. Confira a fila na Empresa.'
                    : 'Estimativa atualizada.',
                );
                return c.refresh();
              })
              .catch((e) => setNotice(e.message))
              .finally(() => setBusy(false));
          }}
        >
          {r ? 'Recalcular rota' : 'Calcular rota'}
        </Button>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}

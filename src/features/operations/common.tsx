import { Button } from '../../components/Button';
/* eslint-disable react-refresh/only-export-components -- Utilitários internos compartilhados das telas operacionais. */
import { useCallback, useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { api } from '../api';
import type { Status } from '../../../shared/order-state';
interface Item {
  variant_id: string;
  quantity: number;
  product_name?: string;
  variant_label?: string;
  units_per_box: number;
  unit_price_cents: number;
}
export interface OperationalOrder {
  id: string;
  customer_id: string;
  customer_name: string;
  notes: string;
  due_at: string;
  status: Status;
  version: number;
  delivery_type: 'delivery' | 'pickup';
  delivery_address: string;
  courier: 'unassigned' | 'owner' | 'partner' | 'courier';
  courier_name: string;
  courier_fee_cents: number;
  total_cents: number;
  items: Item[];
}
export function useRemote<T>(path: string) {
  const [data, setData] = useState<{ path: string; value: T } | null>(null),
    [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      setData({ path, value: await api<T>(path) });
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [path]);
  useEffect(() => {
    let current = true;
    api<T>(path)
      .then((d) => {
        if (current) {
          setData({ path, value: d });
          setError('');
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [path]);
  return { data: data?.path === path ? data.value : null, error, refresh };
}
export function Failure({ message }: { message: string }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;
}
export const localDay = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export function MapLink({ order }: { order: OperationalOrder }) {
  return order.delivery_address ? (
    <Button
      className="button secondary"
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`}
      target="_blank"
      rel="noreferrer"
    >
      <MapPin size={20} aria-hidden="true" /> Mapa
    </Button>
  ) : (
    <span>Endereço a preencher</span>
  );
}
export const nextLabel: Partial<Record<Status, string>> = {
  confirmed: 'Confirmar',
  in_production: 'Iniciar produção',
  ready: 'Marcar pronto',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Marcar entregue',
  picked_up: 'Marcar retirado',
};

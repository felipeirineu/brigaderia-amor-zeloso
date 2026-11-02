import type { RouteEstimate } from '../../../shared/routing';
/* eslint-disable react-refresh/only-export-components -- Contexto privado compartilhado. */
import { createContext, useContext, type ReactNode } from 'react';
import { useRemote, Failure } from '../operations/common';
import type { Place } from '../../../shared/field';
export interface FieldData {
  routes?: (RouteEstimate & { id: string })[];
  order_routes?: (RouteEstimate & { id: string })[];
  routing?: { configured: boolean; remaining: number; retry_at: number };
  order_places: { order_id: string; data: Place }[];
  user_id: string;
  role: string;
  sites: { id: string; data: Place; version: number; has_photo: number }[];
  company: { data: Place; version: number };
  staff: { id: string; role: string; display_name: string; version: number }[];
}
const Context = createContext<{
  data: FieldData | null;
  refresh: () => Promise<void>;
} | null>(null);
export const useField = () => useContext(Context);
function Active({ children }: { children: ReactNode }) {
  const view = useRemote<FieldData>('field/context');
  return (
    <Context.Provider value={view}>
      <Failure message={view.error} />
      {children}
    </Context.Provider>
  );
}
export function FieldProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return enabled ? <Active>{children}</Active> : children;
}
export function SiteAvatar({ id, name }: { id: string; name: string }) {
  const c = useField(),
    s = c?.data?.sites.find((s) => s.id === id);
  return s?.has_photo ? (
    <img
      className="site-avatar"
      src={`/api/field/customers/${id}/photo?v=${s.version}`}
      alt=""
      width={64}
      height={64}
    />
  ) : (
    <span className="initial-avatar" aria-hidden="true">
      {name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')}
    </span>
  );
}
export function useCourierLabels() {
  const field = useField();
  return {
    unassigned: 'A definir',
    owner:
      field?.data?.staff
        .filter((s) => s.role === 'owner')
        .map((s) => s.display_name)
        .join(' / ') || 'Administrador',
    partner:
      field?.data?.staff
        .filter((s) => s.role === 'operator')
        .map((s) => s.display_name)
        .join(' / ') || 'Operador',
    courier: 'Motoboy',
  };
}

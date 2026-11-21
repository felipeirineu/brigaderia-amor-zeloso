import { nameInitials } from '../../../shared/initials';
import type { RouteEstimate } from '../../../shared/routing';
/* eslint-disable react-refresh/only-export-components -- Contexto privado compartilhado. */
import { createContext, useContext, useState, type ReactNode } from 'react';
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
  profile_photos_ready?: boolean;
  staff: {
    id: string;
    role: string;
    display_name: string;
    version: number;
    has_photo?: number;
    photo_version?: number;
    /** Só no próprio aparelho do desenvolvedor; fica fora da equipe. */
    developer?: boolean;
  }[];
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
      {nameInitials(name)}
    </span>
  );
}
export function StaffAvatar({
  id,
  name,
  className = '',
}: {
  id: string;
  name?: string;
  className?: string;
}) {
  const field = useField(),
    staff = field?.data?.staff.find((s) => s.id === id);
  const [failed, setFailed] = useState('');
  const src = `/api/field/profile-photos/${id}?v=${staff?.photo_version ?? 0}`;
  const label = name ?? staff?.display_name ?? 'Equipe';
  return staff?.has_photo && failed !== src ? (
    <img
      className={'staff-avatar ' + className}
      src={src}
      onError={() => setFailed(src)}
      width={32}
      height={32}
      alt=""
    />
  ) : (
    <span
      className={'initial-avatar staff-avatar ' + className}
      aria-hidden="true"
    >
      {nameInitials(label)}
    </span>
  );
}
export function CourierAvatars({ courier }: { courier: string }) {
  const field = useField();
  const staff =
    field?.data?.staff.filter(
      (s) =>
        !s.developer &&
        s.role ===
          (courier === 'owner'
            ? 'owner'
            : courier === 'partner'
              ? 'operator'
              : ''),
    ) ?? [];
  return (
    <span className="courier-avatars" aria-hidden="true">
      {staff.map((s) => (
        <StaffAvatar key={s.id} id={s.id} />
      ))}
    </span>
  );
}
export function StaffIdentity({ id }: { id: string }) {
  const field = useField(),
    staff = field?.data?.staff.find((s) => s.id === id);
  return (
    <span className="staff-identity">
      <StaffAvatar id={id} />
      {staff?.display_name ?? 'Pessoa da equipe'}
    </span>
  );
}
export function useCourierLabels() {
  const field = useField();
  return {
    unassigned: 'A definir',
    owner:
      field?.data?.staff
        .filter((s) => s.role === 'owner' && !s.developer)
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

import type { Place } from './field';
export interface RouteEstimate {
  route_provider: 'ors';
  route_km: number;
  route_minutes: number;
  route_computed_at: string;
}
export function routePoints(base: Place, destination: Place) {
  if (
    [
      base.latitude,
      base.longitude,
      destination.latitude,
      destination.longitude,
    ].some((v) => v === null || !Number.isFinite(v))
  )
    return null;
  return [
    [base.longitude!, base.latitude!],
    [destination.longitude!, destination.latitude!],
  ];
}

export const mapApps = {
  google: 'Google Maps',
  waze: 'Waze',
  apple: 'Mapas do iPhone',
};
export type MapApp = keyof typeof mapApps;
const key = (user: string) => 'az-map-app:' + user;
export function readMapApp(user: string): MapApp | null {
  if (!user) return null;
  try {
    const value = localStorage.getItem(key(user));
    return value && Object.hasOwn(mapApps, value) ? (value as MapApp) : null;
  } catch {
    return null;
  }
}
export function rememberMapApp(user: string, app: MapApp) {
  if (!user) return;
  try {
    localStorage.setItem(key(user), app);
  } catch {
    /* Preferência opcional; navegação continua disponível. */
  }
}

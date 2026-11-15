export interface Place {
  name: string;
  /** Linha única usada por mapa, Uber/99, WhatsApp e pedidos. Montada a partir
   *  dos campos abaixo quando `street` existe; texto livre nos cadastros antigos. */
  address: string;
  street?: string;
  number?: string;
  no_number?: boolean;
  complement?: string;
  neighborhood: string;
  city?: string;
  reference?: string;
  latitude: number | null;
  longitude: number | null;
  instagram: string;
}
export const emptyPlace = (): Place => ({
  name: '',
  address: '',
  street: '',
  number: '',
  no_number: false,
  complement: '',
  neighborhood: '',
  city: '',
  reference: '',
  latitude: null,
  longitude: null,
  instagram: '',
});
/** "Rua X, 123, Apto 2, Bairro, Cidade" (S/N quando marcado). */
export function composeAddress(p: Partial<Place>) {
  const street = (p.street ?? '').trim();
  if (!street) return '';
  const number = p.no_number ? 'S/N' : (p.number ?? '').trim();
  return [street, number, p.complement, p.neighborhood, p.city]
    .map((x) => (x ?? '').trim())
    .filter(Boolean)
    .join(', ');
}
/** Recalcula `address` quando há campos separados; preserva o texto antigo. */
export function withAddress<T extends Partial<Place>>(p: T): T {
  const composed = composeAddress(p);
  return composed ? { ...p, address: composed } : p;
}
/** Endereço para entrega: inclui o ponto de referência, se houver. */
export function deliveryAddress(p: Partial<Place>) {
  const base = (p.address ?? '').trim(),
    ref = (p.reference ?? '').trim();
  return ref && base ? base + ' · Ref.: ' + ref : base;
}
export function instagramProfile(raw: string) {
  const text = raw.trim();
  if (!text) return '';
  let handle = text.replace(/^@/, '');
  if (/^https?:/i.test(text)) {
    const u = new URL(text);
    if (
      !['instagram.com', 'www.instagram.com'].includes(u.hostname) ||
      u.search ||
      u.hash
    )
      throw Error('Informe um perfil do Instagram.');
    handle = u.pathname.replace(/^\/+|\/+$/g, '');
  }
  if (
    !/^[a-zA-Z0-9._]{1,30}$/.test(handle) ||
    ['p', 'reel', 'stories', 'explore'].includes(handle.toLowerCase())
  )
    throw Error('Informe um perfil do Instagram.');
  return handle.toLowerCase();
}
export function distance(
  a: Pick<Place, 'latitude' | 'longitude'>,
  b: Pick<Place, 'latitude' | 'longitude'>,
) {
  if (
    a.latitude === null ||
    a.longitude === null ||
    b.latitude === null ||
    b.longitude === null
  )
    return null;
  const rad = (x: number) => (x * Math.PI) / 180,
    dlat = rad(b.latitude - a.latitude),
    dlon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function transportLinks(p: Place) {
  const coords = p.latitude !== null && p.longitude !== null,
    destination = coords ? `${p.latitude},${p.longitude}` : p.address;
  const uber = new URL('https://m.uber.com/ul/');
  uber.searchParams.set('action', 'setPickup');
  uber.searchParams.set('pickup', 'my_location');
  if (coords) {
    uber.searchParams.set('dropoff[latitude]', String(p.latitude));
    uber.searchParams.set('dropoff[longitude]', String(p.longitude));
  }
  uber.searchParams.set('dropoff[nickname]', p.name);
  uber.searchParams.set('dropoff[formatted_address]', p.address);
  return {
    uber: uber.href,
    maps:
      'https://www.google.com/maps/dir/?api=1&destination=' +
      encodeURIComponent(destination),
    waze:
      'https://www.waze.com/ul?' +
      (coords ? 'll=' : 'q=') +
      encodeURIComponent(destination) +
      '&navigate=yes',
  };
}
/** Maior resto em centavos: soma exata; rateio é apenas uma estimativa. */
export function allocateCost(
  cost: number,
  orders: { id: string; total_cents: number }[],
) {
  const sum = orders.reduce((n, o) => n + o.total_cents, 0);
  const rows = orders.map((o) => {
    const weight = sum ? o.total_cents : 1,
      den = sum || orders.length;
    return {
      id: o.id,
      cents: Math.floor((cost * weight) / den),
      remainder: (cost * weight) % den,
    };
  });
  let left = cost - rows.reduce((n, o) => n + o.cents, 0);
  for (const o of [...rows].sort(
    (a, b) => b.remainder - a.remainder || a.id.localeCompare(b.id),
  )) {
    if (left-- <= 0) break;
    o.cents++;
  }
  return rows.map(({ id, cents }) => ({ id, cents }));
}
export const travelModes = {
  uber: 'Uber',
  '99': '99',
  courier: 'Motoboy',
  car: 'Carro próprio',
  walk: 'A pé/bicicleta',
  other: 'Outro',
};
export const travelLegs = {
  outbound: 'Ida',
  return: 'Volta',
  roundtrip: 'Ida e volta',
};

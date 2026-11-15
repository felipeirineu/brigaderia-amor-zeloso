import type { Place } from '../shared/field';
import { emptyPlace } from '../shared/field';
import { HttpError, hash } from './security';

type Feature = {
  geometry?: { coordinates?: number[] };
  properties?: Record<string, string>;
};
const cut = (v: unknown, n: number) => String(v ?? '').slice(0, n);

/** Converte um resultado do Photon em endereço com campos separados. */
function toPlace(f: Feature): Place[] {
  const [longitude, latitude] = f.geometry?.coordinates ?? [],
    p = f.properties ?? {};
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return [];
  return [
    {
      ...emptyPlace(),
      name: cut(p.name, 120),
      address: [
        p.street,
        p.housenumber,
        p.district,
        p.city,
        p.state,
        p.postcode,
        p.country,
      ]
        .filter(Boolean)
        .join(', ')
        .slice(0, 1000),
      street: cut(p.street, 200),
      number: cut(p.housenumber, 20),
      neighborhood: cut(p.district ?? p.locality, 150),
      city: cut(p.city, 120),
      latitude,
      longitude,
    },
  ];
}

/**
 * Adaptador Photon (OpenStreetMap): sem conta nem chave. Uma chamada por
 * segundo para a organização inteira e cache de 24 h por consulta.
 */
async function photon(
  db: D1Database,
  org: string,
  cacheKey: string,
  url: URL,
  limit: number,
  userAgent = 'BrigaderiaGestao/1.0',
): Promise<Place[]> {
  const key = await hash(cacheKey),
    now = Date.now();
  const cached = await db
    .prepare(
      'SELECT data FROM place_cache WHERE organization_id=? AND query_hash=? AND expires_at>?',
    )
    .bind(org, key, now)
    .first<{ data: string }>();
  if (cached) return JSON.parse(cached.data);
  const slot = await db
    .prepare(
      "UPDATE provider_limits SET next_at=? WHERE id='photon' AND next_at<=?",
    )
    .bind(now + 1100, now)
    .run();
  if (!slot.meta.changes)
    throw new HttpError(429, 'Aguarde um instante antes de buscar novamente.');
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': /^[\x20-\x7E]{1,200}$/.test(userAgent.trim())
          ? userAgent.trim()
          : 'BrigaderiaGestao/1.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new HttpError(
      503,
      'Busca indisponível. Preencha o endereço manualmente.',
    );
  }
  if (!res.ok)
    throw new HttpError(
      503,
      'Busca indisponível. Preencha o endereço manualmente.',
    );
  const payload = (await res.json()) as { features?: Feature[] };
  const results = (payload.features ?? []).slice(0, limit).flatMap(toPlace);
  await db.batch([
    db
      .prepare(
        'DELETE FROM place_cache WHERE expires_at<=? OR (organization_id=? AND query_hash NOT IN(SELECT query_hash FROM place_cache WHERE organization_id=? ORDER BY expires_at DESC LIMIT 99))',
      )
      .bind(now, org, org),
    db
      .prepare(
        'INSERT INTO place_cache(organization_id,query_hash,data,expires_at) VALUES(?,?,?,?) ON CONFLICT(organization_id,query_hash) DO UPDATE SET data=excluded.data,expires_at=excluded.expires_at',
      )
      .bind(org, key, JSON.stringify(results), now + 86400000),
  ]);
  return results;
}

/**
 * Sugestões por nome ou endereço digitado. Com a base da empresa cadastrada,
 * o Photon prioriza o que está perto dela (ex.: "Shopping" traz primeiro os
 * da cidade). A base vai arredondada (~1 km): basta para ordenar.
 */
export async function searchPlaces(
  db: D1Database,
  org: string,
  query: string,
  userAgent?: string,
): Promise<Place[]> {
  const u = new URL('https://photon.komoot.io/api/');
  u.searchParams.set('q', query);
  u.searchParams.set('limit', '6');
  let bias = '';
  try {
    const row = await db
      .prepare(
        'SELECT data FROM company_places WHERE organization_id=? AND id=?',
      )
      .bind(org, org)
      .first<{ data: string }>();
    const base = row ? (JSON.parse(row.data) as Partial<Place>) : null;
    if (
      typeof base?.latitude === 'number' &&
      typeof base?.longitude === 'number'
    ) {
      const lat = base.latitude.toFixed(2),
        lon = base.longitude.toFixed(2);
      u.searchParams.set('lat', lat);
      u.searchParams.set('lon', lon);
      bias = '@' + lat + ',' + lon;
    }
  } catch {
    // Sem base legível, busca sem prioridade de proximidade.
  }
  return photon(db, org, query.toLowerCase() + bias, u, 6, userAgent);
}

/**
 * Endereço provável de uma coordenada ("Usar minha localização"). Arredonda
 * para ~10 m antes de consultar e guardar no cache: o suficiente para achar a
 * rua sem enviar a posição exata do aparelho.
 */
export async function reversePlace(
  db: D1Database,
  org: string,
  latitude: number,
  longitude: number,
  userAgent?: string,
): Promise<Place | null> {
  const lat = latitude.toFixed(4),
    lon = longitude.toFixed(4);
  const u = new URL('https://photon.komoot.io/reverse');
  u.searchParams.set('lat', lat);
  u.searchParams.set('lon', lon);
  u.searchParams.set('limit', '1');
  const [found] = await photon(
    db,
    org,
    'reverse:' + lat + ',' + lon,
    u,
    1,
    userAgent,
  );
  return found ?? null;
}

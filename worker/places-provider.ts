import type { Place } from '../shared/field';
import { emptyPlace } from '../shared/field';
import { HttpError, hash } from './security';
/** Adaptador Photon: permite sugestões; nenhum fornecedor pago/chave. */
export async function searchPlaces(
  db: D1Database,
  org: string,
  query: string,
): Promise<Place[]> {
  const key = await hash(query.toLowerCase()),
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
  const u = new URL('https://photon.komoot.io/api/');
  u.searchParams.set('q', query);
  u.searchParams.set('limit', '5');
  let res: Response;
  try {
    res = await fetch(u, {
      headers: {
        'User-Agent':
          'BrigaderiaGestao/1.0 (+https://github.com/felipeirineu/brigaderia-amor-zeloso)',
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
  const payload = (await res.json()) as {
    features?: {
      geometry?: { coordinates?: number[] };
      properties?: Record<string, string>;
    }[];
  };
  const results = (payload.features ?? []).slice(0, 5).flatMap((f) => {
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
        name: String(p.name ?? '').slice(0, 120),
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
        neighborhood: String(p.district ?? p.locality ?? '').slice(0, 150),
        latitude,
        longitude,
      },
    ];
  });
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

import { z } from 'zod';
import { fieldReady } from './field-ready';
import { body, HttpError, json, type Actor, type Env } from './security';
import { p1Mutation, ownerOnly } from './p1-common';
import { placeSchema } from './field-domain';
import { searchPlaces } from './places-provider';
import { emptyPlace } from '../shared/field';
import { travel } from './travel';
export async function field(req: Request, env: Env, a: Actor) {
  if (!(await fieldReady(env)))
    throw new HttpError(503, 'Localização e deslocamentos ainda não ativados.');
  const db = env.DB!,
    org = a.organization_id,
    parts = new URL(req.url).pathname.split('/'),
    resource = parts[3],
    id = parts[4],
    action = parts[5];
  if (resource === 'trips' || resource === 'travel-report')
    return travel(req, db, a, resource, id, action);
  if (resource === 'search' && req.method === 'POST') {
    const d = await body(
      req,
      z.object({ q: z.string().trim().min(3).max(200) }).strict(),
    );
    return json(await searchPlaces(db, org, d.q));
  }
  if (resource === 'orders' && id && req.method === 'GET') {
    if (
      !(await db
        .prepare('SELECT 1 FROM orders WHERE organization_id=? AND id=?')
        .bind(org, id)
        .first())
    )
      throw new HttpError(404, 'Pedido não encontrado.');
    const row = await db
      .prepare(
        'SELECT data FROM order_places WHERE organization_id=? AND order_id=?',
      )
      .bind(org, id)
      .first<{ data: string }>();
    return json(row ? JSON.parse(row.data) : null);
  }
  if (resource === 'context' && req.method === 'GET') {
    const sites = (
      await db
        .prepare(
          'SELECT id,data,version,photo IS NOT NULL AS has_photo FROM customer_sites WHERE organization_id=?',
        )
        .bind(org)
        .all<{ id: string; data: string; version: number; has_photo: number }>()
    ).results;
    const staff = (
      await db
        .prepare(
          "SELECT m.user_id AS id,m.role,COALESCE(p.display_name,CASE WHEN m.role='owner' THEN 'Administrador' ELSE 'Operador' END) AS display_name,COALESCE(p.version,0) AS version FROM memberships m LEFT JOIN display_profiles p ON p.organization_id=m.organization_id AND p.id=m.user_id WHERE m.organization_id=? ORDER BY m.role,m.user_id",
        )
        .bind(org)
        .all()
    ).results;
    const company = await db
      .prepare(
        'SELECT data,version FROM company_places WHERE organization_id=? AND id=?',
      )
      .bind(org, org)
      .first<{ data: string; version: number }>();
    const orderPlaces = (
      await db
        .prepare(
          'SELECT p.order_id,p.data FROM order_places p JOIN orders o ON o.organization_id=p.organization_id AND o.id=p.order_id WHERE p.organization_id=? AND o.active=1 ORDER BY o.due_at DESC LIMIT 1000',
        )
        .bind(org)
        .all<{ order_id: string; data: string }>()
    ).results.map((p) => ({ order_id: p.order_id, data: JSON.parse(p.data) }));
    return json({
      order_places: orderPlaces,
      sites: sites.map((s) => ({ ...s, data: JSON.parse(s.data) })),
      staff,
      company: company
        ? { data: JSON.parse(company.data), version: company.version }
        : { data: emptyPlace(), version: 0 },
      user_id: a.user_id,
      role: a.role,
    });
  }
  if (resource === 'profile' && req.method === 'PUT')
    return p1Mutation(req, db, a, async (raw, nonce) => {
      const d = z
        .object({
          display_name: z.string().trim().min(1).max(80),
          version: z.number().int().min(0),
        })
        .strict()
        .parse(raw);
      return {
        id: a.user_id,
        table: 'display_profiles',
        action: 'profile.display_name',
        response: { ok: true },
        first: db
          .prepare(
            'INSERT INTO display_profiles(organization_id,id,display_name,version,mutation_id) SELECT ?,?,?,1,? WHERE (?=0 OR EXISTS(SELECT 1 FROM display_profiles WHERE organization_id=? AND id=? AND version=?)) ON CONFLICT(organization_id,id) DO UPDATE SET display_name=excluded.display_name,version=display_profiles.version+1,mutation_id=excluded.mutation_id WHERE display_profiles.version=?',
          )
          .bind(
            org,
            a.user_id,
            d.display_name,
            nonce,
            d.version,
            org,
            a.user_id,
            d.version,
            d.version,
          ),
        rest: () => [],
      };
    });
  if (resource === 'customers' && id) {
    if (
      !z.uuid().safeParse(id).success ||
      !(await db
        .prepare(
          'SELECT 1 FROM customers WHERE organization_id=? AND id=? AND active=1',
        )
        .bind(org, id)
        .first())
    )
      throw new HttpError(404, 'Cliente não encontrado.');
    if (action === 'photo') {
      if (req.method === 'GET') {
        const row = await db
          .prepare(
            'SELECT photo FROM customer_sites WHERE organization_id=? AND id=?',
          )
          .bind(org, id)
          .first<{ photo: ArrayBuffer | null }>();
        if (!row?.photo) throw new HttpError(404, 'Sem foto.');
        return new Response(row.photo, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
      if (req.method !== 'PUT') throw new HttpError(405, 'Método inválido.');
      const d = await body(
        req,
        z
          .object({
            version: z.number().int().positive(),
            base64: z.string().max(54616).nullable(),
          })
          .strict(),
        65536,
      );
      const binary =
        d.base64 === null
          ? null
          : Uint8Array.from(atob(d.base64), (c) => c.charCodeAt(0));
      if (
        binary &&
        (binary.length > 40960 ||
          binary.length < 12 ||
          String.fromCharCode(...binary.slice(0, 4)) !== 'RIFF' ||
          String.fromCharCode(...binary.slice(8, 12)) !== 'WEBP')
      )
        throw new HttpError(400, 'Use foto WebP de até 40 KB.');
      const nonce = crypto.randomUUID();
      const r = await db.batch([
        db
          .prepare(
            'UPDATE customer_sites SET photo=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?',
          )
          .bind(binary, nonce, org, id, d.version),
        db
          .prepare(
            'INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM customer_sites WHERE organization_id=? AND id=? AND mutation_id=?)',
          )
          .bind(
            crypto.randomUUID(),
            org,
            a.user_id,
            'customer.photo',
            id,
            org,
            id,
            nonce,
          ),
      ]);
      if (!r[0].meta.changes)
        throw new HttpError(409, 'Atualize antes de trocar a foto.');
      return json({ version: d.version + 1 });
    }
  }
  if (
    !['company', 'customers'].includes(resource) ||
    req.method !== 'PUT' ||
    (resource === 'customers' && !id)
  )
    throw new HttpError(404, 'Não encontrado.');
  if (resource === 'company') ownerOnly(a);
  return p1Mutation(req, db, a, async (raw, nonce) => {
    const d = z
        .object({ data: placeSchema, version: z.number().int().min(0) })
        .strict()
        .parse(raw),
      table = resource === 'company' ? 'company_places' : 'customer_sites',
      entity = resource === 'company' ? org : id;
    return {
      id: entity,
      table,
      action: resource + '.place',
      response: { id: entity, version: d.version + 1 },
      first: db
        .prepare(
          `INSERT INTO ${table}(organization_id,id,data,version,mutation_id) SELECT ?,?,?,1,? WHERE (?=0 OR EXISTS(SELECT 1 FROM ${table} WHERE organization_id=? AND id=? AND version=?)) ON CONFLICT(organization_id,id) DO UPDATE SET data=excluded.data,version=${table}.version+1,mutation_id=excluded.mutation_id WHERE ${table}.version=?`,
        )
        .bind(
          org,
          entity,
          JSON.stringify(d.data),
          nonce,
          d.version,
          org,
          entity,
          d.version,
          d.version,
        ),
      rest: () => [],
    };
  });
}

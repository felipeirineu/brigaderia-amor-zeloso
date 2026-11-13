import { z } from 'zod';
import { kitCapacities, kitWeights } from '../shared/kits';
import { kitOrdersReady } from './kit-order-items';
import { HttpError, json, type Actor } from './security';
import { ownerOnly, p1Mutation } from './p1-common';
export async function kitsReady(db: D1Database) {
  const r = await db
    .prepare(
      "SELECT COUNT(*) n FROM sqlite_schema WHERE type='table' AND name IN('kits','kit_settings')",
    )
    .first<{ n: number }>();
  return r?.n === 2;
}
const kitSchema = z
  .object({
    weight_grams: z.number().int().min(1).max(500),
    dough_weight_grams: z.number().int().positive().nullable().default(null),
    units_per_kit: z.number().int().min(1).max(500),
    price_cents: z.number().int().min(0).max(100000000),
    max_flavors: z.number().int().min(1).max(500),
    packaging_supply_id: z.uuid().nullable().default(null),
    active: z.boolean().default(true),
    version: z.number().int().positive().optional(),
  })
  .strict()
  .refine(
    (d) => d.max_flavors <= d.units_per_kit,
    'Limite maior que a capacidade.',
  )
  .refine(
    (d) =>
      d.dough_weight_grams === null || d.dough_weight_grams <= d.weight_grams,
    'Peso de massa maior que o doce.',
  );
export async function kits(
  req: Request,
  db: D1Database,
  a: Actor,
  resource: string,
  id?: string,
) {
  const org = a.organization_id;
  if (new URL(req.url).pathname.split('/').length !== (id ? 5 : 4))
    throw new HttpError(404, 'Não encontrado.');
  if (id && !z.uuid().safeParse(id).success)
    throw new HttpError(404, 'Kit não encontrado.');
  if (!(await kitsReady(db)))
    throw new HttpError(503, 'Cadastro de kits ainda indisponível.');
  if (resource === 'kit-settings') {
    if (id) throw new HttpError(404, 'Não encontrado.');
    if (req.method === 'GET') {
      const row = await db
        .prepare(
          'SELECT limit_flavors,version FROM kit_settings WHERE organization_id=? AND id=?',
        )
        .bind(org, org)
        .first<{ limit_flavors: number; version: number }>();
      return json({
        limit_flavors: row ? !!row.limit_flavors : true,
        version: row?.version ?? 0,
      });
    }
    if (req.method !== 'PUT') throw new HttpError(405, 'Método não permitido.');
    ownerOnly(a);
    return p1Mutation(req, db, a, async (raw, nonce) => {
      const d = z
        .object({
          limit_flavors: z.boolean(),
          version: z.number().int().min(0),
        })
        .strict()
        .parse(raw);
      return {
        id: org,
        table: 'kit_settings',
        action: 'kit.flavor_limit_changed',
        response: { ok: true },
        first: db
          .prepare(
            `INSERT INTO kit_settings(organization_id,id,limit_flavors,version,mutation_id) SELECT ?,?,?,1,? WHERE ?=0 OR EXISTS(SELECT 1 FROM kit_settings WHERE organization_id=? AND id=? AND version=?) ON CONFLICT(organization_id,id) DO UPDATE SET limit_flavors=excluded.limit_flavors,version=kit_settings.version+1,mutation_id=excluded.mutation_id WHERE kit_settings.version=?`,
          )
          .bind(
            org,
            org,
            +d.limit_flavors,
            nonce,
            d.version,
            org,
            org,
            d.version,
            d.version,
          ),
        rest: () => [],
      };
    });
  }
  if (resource !== 'kits') throw new HttpError(404, 'Não encontrado.');
  const current = id
    ? await db
        .prepare(
          'SELECT id,version,packaging_supply_id FROM kits WHERE organization_id=? AND id=?',
        )
        .bind(org, id)
        .first<{
          id: string;
          version: number;
          packaging_supply_id: string | null;
        }>()
    : null;
  if (id && !current) throw new HttpError(404, 'Kit não encontrado.');
  if (req.method === 'GET') {
    const rows = (
      await db
        .prepare(
          `SELECT id,weight_grams,dough_weight_grams,units_per_kit,price_cents,max_flavors,packaging_supply_id,active,version FROM kits WHERE organization_id=?${id ? ' AND id=?' : ''} ORDER BY weight_grams,units_per_kit LIMIT 101`,
        )
        .bind(org, ...(id ? [id] : []))
        .all()
    ).results;
    if (rows.length > 100) throw new HttpError(409, 'Mais de 100 kits.');
    return json(id ? rows[0] : rows);
  }
  if (
    (req.method === 'POST' && id) ||
    (req.method === 'PUT' && !id) ||
    !['POST', 'PUT'].includes(req.method)
  )
    throw new HttpError(405, 'Método não permitido.');
  ownerOnly(a);
  return p1Mutation(req, db, a, async (raw, nonce) => {
    const d = kitSchema.parse(raw),
      entity = id ?? crypto.randomUUID();
    if (
      (!kitWeights.some((w) => w === d.weight_grams) ||
        !kitCapacities.some((u) => u === d.units_per_kit)) &&
      !(await kitOrdersReady(db))
    )
      throw new HttpError(
        503,
        'Tamanhos personalizados exigem a migração 0020.',
      );
    if (id && d.version !== current?.version)
      throw new HttpError(409, 'Kit alterado. Atualize antes de salvar.');
    if (d.packaging_supply_id) {
      const supply = await db
        .prepare(
          'SELECT unit,active FROM supplies WHERE organization_id=? AND id=?',
        )
        .bind(org, d.packaging_supply_id)
        .first<{ unit: string; active: number }>();
      if (!supply) throw new HttpError(404, 'Embalagem não encontrada.');
      if (
        supply.unit !== 'unit' ||
        (!supply.active &&
          current?.packaging_supply_id !== d.packaging_supply_id)
      )
        throw new HttpError(
          400,
          'Escolha uma embalagem ativa cadastrada em unidades.',
        );
    }
    return {
      id: entity,
      table: 'kits',
      action: d.active ? 'kit.saved' : 'kit.archived',
      response: { id: entity },
      first: id
        ? db
            .prepare(
              'UPDATE kits SET weight_grams=?,dough_weight_grams=?,units_per_kit=?,price_cents=?,max_flavors=?,packaging_supply_id=?,active=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?',
            )
            .bind(
              d.weight_grams,
              d.dough_weight_grams,
              d.units_per_kit,
              d.price_cents,
              d.max_flavors,
              d.packaging_supply_id,
              +d.active,
              nonce,
              org,
              entity,
              d.version,
            )
        : db
            .prepare(
              'INSERT INTO kits(organization_id,id,weight_grams,dough_weight_grams,units_per_kit,price_cents,max_flavors,packaging_supply_id,active,mutation_id) VALUES(?,?,?,?,?,?,?,?,?,?)',
            )
            .bind(
              org,
              entity,
              d.weight_grams,
              d.dough_weight_grams,
              d.units_per_kit,
              d.price_cents,
              d.max_flavors,
              d.packaging_supply_id,
              +d.active,
              nonce,
            ),
      rest: () => [],
    };
  });
}

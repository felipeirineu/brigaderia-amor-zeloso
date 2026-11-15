import { z } from 'zod';
import { kitCapacities, kitWeights } from '../shared/kits';
import { kitOrdersReady } from './kit-order-items';
import { HttpError, body, json, type Actor } from './security';
import { emptyProfile } from '../shared/finance';
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
  if (resource === 'kit-default') {
    // Define o kit padrão de TODOS os estabelecimentos ativos de uma vez
    // (pessoas físicas ficam de fora). Cria o cadastro B2B vazio quando falta.
    // Repetir com o mesmo kit não muda nada; troca padrões já escolhidos, por
    // isso a tela pede confirmação.
    if (id) throw new HttpError(404, 'Não encontrado.');
    if (req.method !== 'POST')
      throw new HttpError(405, 'Método não permitido.');
    ownerOnly(a);
    if (!z.uuid().safeParse(req.headers.get('Idempotency-Key')).success)
      throw new HttpError(400, 'Chave de repetição inválida.');
    const d = await body(req, z.object({ kit_id: z.uuid() }).strict());
    const kit = await db
      .prepare('SELECT active FROM kits WHERE organization_id=? AND id=?')
      .bind(org, d.kit_id)
      .first<{ active: number }>();
    if (!kit) throw new HttpError(404, 'Kit não encontrado.');
    if (!kit.active) throw new HttpError(400, 'Escolha um kit ativo.');
    const targets =
      "SELECT id FROM customers WHERE organization_id=? AND active=1 AND customer_type='establishment'";
    const r = await db.batch([
      db
        .prepare(
          `UPDATE customer_profiles SET data=json_set(data,'$.default_kit_id',?),version=version+1 WHERE organization_id=? AND customer_id IN(${targets}) AND COALESCE(json_extract(data,'$.default_kit_id'),'')<>?`,
        )
        .bind(d.kit_id, org, org, d.kit_id),
      db
        .prepare(
          `INSERT OR IGNORE INTO customer_profiles(organization_id,customer_id,data) SELECT ?,c.id,json_set(?,'$.default_kit_id',?) FROM customers c WHERE c.organization_id=? AND c.active=1 AND c.customer_type='establishment' AND NOT EXISTS(SELECT 1 FROM customer_profiles p WHERE p.organization_id=c.organization_id AND p.customer_id=c.id)`,
        )
        .bind(org, JSON.stringify(emptyProfile()), d.kit_id, org),
      db
        .prepare(
          "INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) VALUES(?,?,?,'kit.default_all',?)",
        )
        .bind(crypto.randomUUID(), org, a.user_id, d.kit_id),
      db.prepare(`SELECT COUNT(*) AS n FROM (${targets})`).bind(org),
    ]);
    return json({
      changed: (r[0].meta.changes ?? 0) + (r[1].meta.changes ?? 0),
      establishments: Number(
        (r[3].results as { n: number }[] | undefined)?.[0]?.n ?? 0,
      ),
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

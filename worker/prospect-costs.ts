import { p1Ready } from './p1-ready';
import { visiblePhone } from '../shared/phone';
import { kitLabel } from '../shared/kits';
import { z } from 'zod';
import { HttpError, json, hash, type Env, type Actor } from './security';
import { visitsReady } from './visits';
import { p1Mutation, ownerOnly, requestRange } from './p1-common';
import { readRecipes } from './recipes';
import { estimateRecipe, safeQuantity } from './recipe-domain';
import { readCostingSettings, weightCostingReady } from './weight-costing';
import {
  calculateWeightKit,
  type WeightRecipeData,
  type WeightSupply,
} from '../shared/weight-costing';
import type { Kit } from '../shared/kits';
import type { VisitSample, VisitRecord } from '../shared/visits';
import type {
  ProspectEstimate,
  SampleEstimate,
  SampleExpense,
} from '../shared/prospect-costs';
import { businessDay, utcStart, addDays } from './operations-domain';
export async function prospectCostSchema(db: D1Database) {
  return !!(await db
    .prepare(
      "SELECT 1 FROM sqlite_schema WHERE name='prospect_sample_expenses' AND type='table'",
    )
    .first());
}
export const prospectCostsReady = async (env: Env) =>
  (await visitsReady(env)) &&
  (await p1Ready(env)) &&
  (await prospectCostSchema(env.DB!));
export async function costCatalog(db: D1Database, org: string) {
  const legacy = await readRecipes(db, org),
    modern = await weightCostingReady(db);
  const profiles = modern
    ? (
        await db
          .prepare(
            'SELECT id,product_id,data FROM weight_recipes WHERE organization_id=? AND active=1 LIMIT 201',
          )
          .bind(org)
          .all<{ id: string; product_id: string; data: string }>()
      ).results
    : [];
  const kits = modern
    ? (
        await db
          .prepare(
            'SELECT * FROM kits WHERE organization_id=? AND active=1 LIMIT 201',
          )
          .bind(org)
          .all<Kit>()
      ).results
    : [];
  const settings = modern ? await readCostingSettings(db, org) : null;
  const supplies = modern
    ? (
        await db
          .prepare(
            'SELECT id,name,unit,pack_quantity_milli,pack_cost_cents,active FROM supplies WHERE organization_id=? LIMIT 501',
          )
          .bind(org)
          .all<WeightSupply>()
      ).results
    : [];
  if (profiles.length > 200 || kits.length > 200 || supplies.length > 500)
    throw new HttpError(
      409,
      'Cadastro de custos excede a consulta; revise a quantidade de fichas/insumos.',
    );
  const cache = new Map<
    string,
    { unit: number | null; source: SampleEstimate['source']; missing: string[] }
  >();
  return (lines: VisitSample[]): ProspectEstimate => {
    const estimated = lines.map((s) => {
      const key = s.product_id + '|' + s.weight_grams;
      if (!cache.has(key)) {
        let unit: number | null = null,
          source: SampleEstimate['source'] = 'missing';
        const missing: string[] = [];
        try {
          if (s.weight_grams === null)
            missing.push('Peso da amostra não informado.');
          else {
            const modernProfiles = profiles.filter(
              (p) => p.product_id === s.product_id,
            );
            if (modernProfiles.length) {
              if (modernProfiles.length !== 1)
                missing.push('Ficha por peso ambígua.');
              else {
                const data = JSON.parse(
                  modernProfiles[0].data,
                ) as WeightRecipeData;
                const mass = [
                  ...new Set([
                    ...kits
                      .filter(
                        (k) =>
                          k.weight_grams === s.weight_grams &&
                          k.dough_weight_grams !== null,
                      )
                      .map((k) => k.dough_weight_grams!),
                    ...data.measured
                      .filter((m) => m.weight_grams === s.weight_grams)
                      .map((m) => m.dough_milli / 1000),
                  ]),
                ];
                if (
                  mass.length !== 1 ||
                  !Number.isInteger(mass[0]) ||
                  mass[0] > s.weight_grams
                )
                  missing.push(
                    'Peso de massa ausente ou ambíguo para este tamanho.',
                  );
                else {
                  // Apenas custo unitário: sem caixa de venda, opcionais ou canal iFood presumidos.
                  const result = calculateWeightKit(
                    data,
                    settings!.data,
                    {
                      id: 'sample',
                      weight_grams: s.weight_grams,
                      dough_weight_grams: mass[0],
                      units_per_kit: 1,
                      price_cents: 0,
                      max_flavors: 1,
                      packaging_supply_id: null,
                      active: 1,
                      version: 0,
                    },
                    supplies,
                    [],
                    0,
                  );
                  if (result.unit_cost_cents === null)
                    missing.push(
                      'Confira massa, rendimento, acabamento e forminha na ficha por peso.',
                    );
                  else {
                    unit = safeQuantity(
                      (BigInt(result.unit_cost_cents) *
                        BigInt(10000 + settings!.data.overhead_bps) +
                        9999n) /
                        10000n,
                    );
                    source = 'weight';
                  }
                }
              }
            } else {
              const matches = legacy.filter(
                (r) =>
                  r.active &&
                  r.product_id === s.product_id &&
                  r.weight_grams === s.weight_grams,
              );
              if (matches.length !== 1)
                missing.push(
                  matches.length
                    ? 'Ficha por unidade ambígua.'
                    : 'Ficha por unidade não cadastrada para o sabor/peso.',
                );
              else if (!matches[0].components.length)
                missing.push('Ficha sem insumos.');
              else {
                const r = estimateRecipe(
                  { ...matches[0], packaging_cents: 0 },
                  matches[0].components,
                );
                unit = r.unit_cost_cents;
                source = unit === null ? 'missing' : 'recipe';
                missing.push(
                  ...r.missing.map((n) => 'Insumo sem custo ou inativo: ' + n),
                );
              }
            }
          }
        } catch {
          unit = null;
          source = 'missing';
          missing.push('Estimativa excede o limite ou ficha inconsistente.');
        }
        cache.set(key, { unit, source, missing });
      }
      const c = cache.get(key)!;
      let total: number | null = null;
      try {
        if (c.unit !== null)
          total = safeQuantity(BigInt(c.unit) * BigInt(s.units));
      } catch {
        total = null;
      }
      return {
        product_id: s.product_id,
        name: s.product_name,
        weight_grams: s.weight_grams,
        units: s.units,
        unit_cost_cents: c.unit,
        estimated_cost_cents: total,
        source: c.source,
        missing: c.missing,
      };
    });
    const known = safeQuantity(
      estimated.reduce((n, l) => n + BigInt(l.estimated_cost_cents ?? 0), 0n),
    );
    return {
      lines: estimated,
      estimated_cents: estimated.some((l) => l.estimated_cost_cents === null)
        ? null
        : known,
      known_cents: known,
      missing: [
        ...new Set(
          estimated.flatMap((l) =>
            l.estimated_cost_cents === null
              ? l.missing.length
                ? l.missing.map((m) => l.name + ': ' + m)
                : [l.name + ': custo indisponível.']
              : [],
          ),
        ),
      ],
    };
  };
}
export async function costPayments(
  db: D1Database,
  org: string,
  visitIds: string[],
) {
  const ids = JSON.stringify(visitIds);
  const expenses = (
    await db
      .prepare(
        'SELECT l.visit_id,e.id,e.amount_cents,e.spent_on,e.method FROM prospect_sample_expenses l JOIN expense_events e ON e.organization_id=l.organization_id AND e.id=l.expense_id WHERE l.organization_id=? AND l.visit_id IN(SELECT value FROM json_each(?)) AND NOT EXISTS(SELECT 1 FROM expense_events r WHERE r.organization_id=e.organization_id AND r.reversal_of=e.id)',
      )
      .bind(org, ids)
      .all<SampleExpense & { visit_id: string }>()
  ).results;
  const rides = (
    await db
      .prepare(
        'SELECT l.visit_id,SUM(t.amount_cents) AS cents FROM prospect_visit_trips l JOIN displacements t ON t.organization_id=l.organization_id AND t.id=l.displacement_id WHERE l.organization_id=? AND l.visit_id IN(SELECT value FROM json_each(?)) AND t.reversal_of IS NULL AND NOT EXISTS(SELECT 1 FROM displacements r WHERE r.organization_id=t.organization_id AND r.reversal_of=t.id) GROUP BY l.visit_id',
      )
      .bind(org, ids)
      .all<{ visit_id: string; cents: number }>()
  ).results;
  return { expenses, rides };
}
export async function sampleCosts(
  req: Request,
  env: Env,
  a: Actor,
  row: Record<string, unknown>,
  action: string,
) {
  if (!(await prospectCostsReady(env)))
    throw new HttpError(404, 'Não encontrado.');
  const db = env.DB!,
    org = a.organization_id,
    id = String(row.id);
  // A linha já foi localizada no tenant antes de validar papel ou estado.
  if (action === 'sample-expense') ownerOnly(a);
  if (row.status !== 'completed' || !row.record_data)
    throw new HttpError(409, 'Registre a visita antes de consultar custos.');
  const record = JSON.parse(String(row.record_data)) as VisitRecord;
  if (action === 'costs' && req.method === 'GET') {
    const estimate = (await costCatalog(db, org))(record.samples),
      payments = await costPayments(db, org, [id]);
    const expense = payments.expenses[0] ?? null,
      rides = payments.rides[0]?.cents ?? 0,
      sample = expense?.amount_cents ?? estimate.estimated_cents;
    return json({
      visit_id: id,
      visit_version: row.version,
      can_register_expense: a.role === 'owner' && record.samples.length > 0,
      estimate,
      estimate_hash: await hash(JSON.stringify(estimate)),
      expense,
      rides_cents: rides,
      sample_cost_used_cents: sample,
      total_cost_cents:
        sample === null ? null : safeQuantity(BigInt(sample) + BigInt(rides)),
      source: expense ? 'paid' : sample === null ? 'missing' : 'estimated',
    });
  }
  if (action !== 'sample-expense' || req.method !== 'POST')
    throw new HttpError(405, 'Método não permitido.');
  return p1Mutation(req, db, a, async (raw, nonce) => {
    const d = z
      .object({
        version: z.number().int().positive(),
        estimate_hash: z.string().regex(/^[a-f0-9]{64}$/),
        amount_cents: z.number().int().positive().max(1000000000),
        method: z.enum(['pix', 'cash', 'debit', 'credit', 'transfer', 'other']),
        spent_on: z.iso.date(),
        notes: z.string().trim().max(500).default(''),
      })
      .strict()
      .parse(raw);
    if (d.spent_on > businessDay())
      throw new HttpError(400, 'Despesa futura não é pagamento registrado.');
    if (!record.samples.length)
      throw new HttpError(400, 'Visita sem amostras.');
    const estimate = (await costCatalog(db, org))(record.samples);
    if ((await hash(JSON.stringify(estimate))) !== d.estimate_hash)
      throw new HttpError(
        409,
        'A estimativa mudou. Atualize e confira antes de registrar.',
      );
    const expense = crypto.randomUUID();
    return {
      table: 'prospect_visits' as const,
      id,
      action: 'visit.sample_expense',
      response: { id, expense_id: expense, version: d.version + 1 },
      first: db
        .prepare(
          "UPDATE prospect_visits SET version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=? AND status='completed' AND NOT EXISTS(SELECT 1 FROM prospect_sample_expenses l JOIN expense_events e ON e.organization_id=l.organization_id AND e.id=l.expense_id WHERE l.organization_id=? AND l.visit_id=? AND NOT EXISTS(SELECT 1 FROM expense_events r WHERE r.organization_id=e.organization_id AND r.reversal_of=e.id))",
        )
        .bind(nonce, org, id, d.version, org, id),
      rest: (g, args) => [
        db
          .prepare(
            `INSERT INTO expense_events(organization_id,id,kind,amount_cents,category,description,method,spent_on,user_id) SELECT ?,?,'expense',?,'prospecting',?,?,?,? WHERE ${g}`,
          )
          .bind(
            org,
            expense,
            d.amount_cents,
            'Amostras e prospecção · ' + String(row.customer_name),
            d.method,
            d.spent_on,
            a.user_id,
            ...args,
          ),
        db
          .prepare(
            `INSERT INTO prospect_sample_expenses(organization_id,expense_id,visit_id,data) SELECT ?,?,?,? WHERE ${g}`,
          )
          .bind(
            org,
            expense,
            id,
            JSON.stringify({ estimate, notes: d.notes }),
            ...args,
          ),
      ],
    };
  });
}
export async function prospectReport(req: Request, env: Env, a: Actor) {
  if (!(await prospectCostsReady(env)))
    throw new HttpError(404, 'Não encontrado.');
  if (req.method !== 'GET') throw new HttpError(405, 'Método não permitido.');
  const db = env.DB!,
    org = a.organization_id,
    { from, to } = requestRange(req, 366),
    start = utcStart(from),
    end = utcStart(addDays(to, 1));
  const periodVisits = (
    await db
      .prepare(
        "SELECT v.id,v.customer_id,v.data AS plan_data,r.data,c.name,p.data AS prospect_data FROM prospect_visits v JOIN prospect_visit_records r ON r.organization_id=v.organization_id AND r.visit_id=v.id JOIN customers c ON c.organization_id=v.organization_id AND c.id=v.customer_id LEFT JOIN prospect_details p ON p.organization_id=v.organization_id AND p.customer_id=v.customer_id WHERE v.organization_id=? AND json_extract(r.data,'$.occurred_at')>=? AND json_extract(r.data,'$.occurred_at')<? ORDER BY v.id LIMIT 1001",
      )
      .bind(org, start, end)
      .all<{
        id: string;
        customer_id: string;
        data: string;
        name: string;
        prospect_data: string;
        plan_data: string;
      }>()
  ).results;
  const selected = periodVisits.filter(
    (v) => JSON.parse(v.plan_data).audience !== 'customer',
  );
  const customerVisits = periodVisits.filter(
    (v) => JSON.parse(v.plan_data).audience === 'customer',
  );
  const conversions = (
    await db
      .prepare(
        "SELECT p.customer_id,json_extract(p.data,'$.converted_at') AS converted_at FROM prospect_details p WHERE p.organization_id=? AND json_extract(p.data,'$.converted_at')>=? AND json_extract(p.data,'$.converted_at')<? ORDER BY p.customer_id LIMIT 1001",
      )
      .bind(org, start, end)
      .all<{ customer_id: string; converted_at: string }>()
  ).results;
  if (periodVisits.length > 1000 || conversions.length > 1000)
    throw new HttpError(
      409,
      'Mais de 1000 visitas/conversões; reduza o período.',
    );
  const historical = conversions.length
    ? (
        await db
          .prepare(
            "SELECT v.id,v.customer_id,r.data FROM prospect_visits v JOIN prospect_visit_records r ON r.organization_id=v.organization_id AND r.visit_id=v.id JOIN prospect_details p ON p.organization_id=v.organization_id AND p.customer_id=v.customer_id WHERE v.organization_id=? AND v.customer_id IN(SELECT value FROM json_each(?)) AND coalesce(json_extract(v.data,'$.audience'),'prospect')='prospect' AND json_extract(r.data,'$.occurred_at')<=json_extract(p.data,'$.converted_at') ORDER BY v.id LIMIT 2001",
          )
          .bind(org, JSON.stringify(conversions.map((c) => c.customer_id)))
          .all<{ id: string; customer_id: string; data: string }>()
      ).results
    : [];
  if (historical.length > 2000)
    throw new HttpError(
      409,
      'Histórico de aquisição excede 2000 visitas; reduza o período de conversões.',
    );
  const calculate = await costCatalog(db, org),
    all = [
      ...new Map(
        [...periodVisits, ...historical].map((v) => [v.id, v]),
      ).values(),
    ],
    payments = await costPayments(
      db,
      org,
      all.map((v) => v.id),
    );
  const estimates = new Map(
    all.map((v) => [
      v.id,
      calculate((JSON.parse(v.data) as VisitRecord).samples),
    ]),
  );
  const used = (id: string) =>
    payments.expenses.find((e) => e.visit_id === id)?.amount_cents ??
    estimates.get(id)!.estimated_cents;
  const rides = (id: string) =>
    payments.rides.find((r) => r.visit_id === id)?.cents ?? 0;
  const sum = (values: (number | null)[]) =>
    values.some((v) => v === null)
      ? null
      : safeQuantity(values.reduce<bigint>((n, v) => n + BigInt(v!), 0n));
  const selectedContacts = new Map<
    string,
    { first: string; converted: string }
  >();
  for (const v of selected) {
    const r = JSON.parse(v.data) as VisitRecord,
      conv = JSON.parse(v.prospect_data || '{}').converted_at || '',
      prev = selectedContacts.get(v.customer_id);
    selectedContacts.set(v.customer_id, {
      first: prev && prev.first < r.occurred_at ? prev.first : r.occurred_at,
      converted: conv,
    });
  }
  const cohort = [...selectedContacts.values()].filter(
    (c) => c.converted >= c.first && c.converted < end,
  ).length;
  const firstHistorical = new Map<string, string>();
  for (const v of historical) {
    const at = (JSON.parse(v.data) as VisitRecord).occurred_at;
    if (
      !firstHistorical.has(v.customer_id) ||
      at < firstHistorical.get(v.customer_id)!
    )
      firstHistorical.set(v.customer_id, at);
  }
  const qualified = conversions.filter((c) =>
    firstHistorical.has(c.customer_id),
  );
  const days = qualified.map(
    (c) =>
      (Date.parse(c.converted_at) -
        Date.parse(firstHistorical.get(c.customer_id)!)) /
      86400000,
  );
  const flavors = new Map<
    string,
    {
      product_id: string;
      name: string;
      weight_grams: number | null;
      units: number;
      costs: (number | null)[];
      contacts: Set<string>;
      converted: Set<string>;
    }
  >();
  for (const v of selected) {
    const at = (JSON.parse(v.data) as VisitRecord).occurred_at,
      conv = JSON.parse(v.prospect_data || '{}').converted_at || '';
    for (const s of estimates.get(v.id)!.lines) {
      const key = s.product_id + '|' + s.weight_grams;
      const f = flavors.get(key) ?? {
        product_id: s.product_id,
        name: s.name,
        weight_grams: s.weight_grams,
        units: 0,
        costs: [],
        contacts: new Set<string>(),
        converted: new Set<string>(),
      };
      f.units += s.units;
      f.costs.push(s.estimated_cost_cents);
      f.contacts.add(v.customer_id);
      if (conv >= at && conv < end) f.converted.add(v.customer_id);
      flavors.set(key, f);
    }
  }
  const rows = [...flavors.values()]
    .map((f) => ({
      product_id: f.product_id,
      name: f.name,
      weight_grams: f.weight_grams,
      units: f.units,
      cost_cents: sum(f.costs),
      contacts: f.contacts.size,
      converted: f.converted.size,
      rate: f.contacts.size ? (100 * f.converted.size) / f.contacts.size : null,
    }))
    .sort((a, b) => b.converted - a.converted || a.name.localeCompare(b.name));
  const flavorTotals = new Map<
    string,
    { name: string; converted: Set<string> }
  >();
  for (const f of flavors.values()) {
    const total = flavorTotals.get(f.product_id) ?? {
      name: f.name,
      converted: new Set<string>(),
    };
    for (const id of f.converted) total.converted.add(id);
    flavorTotals.set(f.product_id, total);
  }
  const top = [...flavorTotals.values()].sort(
    (a, b) =>
      b.converted.size - a.converted.size || a.name.localeCompare(b.name),
  )[0];
  const acquisition = historical.map((v) => {
      const n = used(v.id);
      return n === null ? null : safeQuantity(BigInt(n) + BigInt(rides(v.id)));
    }),
    acq = sum(acquisition),
    acqKnown = safeQuantity(
      acquisition.reduce<bigint>((n, v) => n + BigInt(v ?? 0), 0n),
    );
  const estimated = sum(
      selected.map((v) => estimates.get(v.id)!.estimated_cents),
    ),
    known = safeQuantity(
      selected.reduce(
        (n, v) => n + BigInt(estimates.get(v.id)!.known_cents),
        0n,
      ),
    );
  return json({
    from,
    to,
    visits: periodVisits.length,
    prospect_visits: selected.length,
    customer_visits: customerVisits.length,
    customer_cost_used_cents: sum(
      customerVisits.map((v) => {
        const s = used(v.id);
        return s === null
          ? null
          : safeQuantity(BigInt(s) + BigInt(rides(v.id)));
      }),
    ),
    visited_contacts: selectedContacts.size,
    cohort_converted: cohort,
    cohort_rate: selectedContacts.size
      ? (100 * cohort) / selectedContacts.size
      : null,
    conversions: qualified.length,
    conversions_without_visits: conversions.length - qualified.length,
    average_days: days.length
      ? days.reduce((n, d) => n + d, 0) / days.length
      : null,
    estimated_samples_cents: estimated,
    known_estimated_samples_cents: known,
    paid_samples_cents: sum(
      selected.map(
        (v) =>
          payments.expenses.find((e) => e.visit_id === v.id)?.amount_cents ?? 0,
      ),
    ),
    rides_cents: sum(selected.map((v) => rides(v.id))),
    cost_used_cents: sum(
      selected.map((v) => {
        const s = used(v.id);
        return s === null
          ? null
          : safeQuantity(BigInt(s) + BigInt(rides(v.id)));
      }),
    ),
    acquisition_total_cents: acq,
    acquisition_known_cents: acqKnown,
    acquisition_per_customer_cents:
      qualified.length && acq !== null
        ? Math.ceil(acq / qualified.length)
        : null,
    missing: [...new Set(all.flatMap((v) => estimates.get(v.id)!.missing))],
    flavors: rows,
    top_flavor: top?.converted.size
      ? { name: top.name, converted: top.converted.size }
      : null,
  });
}

export async function prospectVisitTools(req: Request, env: Env, a: Actor) {
  if (!(await prospectCostsReady(env)))
    throw new HttpError(404, 'Não encontrado.');
  const u = new URL(req.url),
    parts = u.pathname.split('/'),
    id = parts[3],
    action = parts[4];
  if (parts.length !== 5 || !z.uuid().safeParse(id).success)
    throw new HttpError(404, 'Não encontrado.');
  const row = await env
    .DB!.prepare(
      'SELECT v.id,v.customer_id,v.status,v.version,c.name AS customer_name,c.phone,c.active,p.data AS prospect_data,r.data AS record_data FROM prospect_visits v JOIN customers c ON c.organization_id=v.organization_id AND c.id=v.customer_id LEFT JOIN prospect_details p ON p.organization_id=c.organization_id AND p.customer_id=c.id LEFT JOIN prospect_visit_records r ON r.organization_id=v.organization_id AND r.visit_id=v.id WHERE v.organization_id=? AND v.id=?',
    )
    .bind(a.organization_id, id)
    .first<Record<string, unknown>>();
  if (!row) throw new HttpError(404, 'Não encontrado.');
  if (action !== 'followup') return sampleCosts(req, env, a, row, action);
  if (req.method !== 'GET') throw new HttpError(405, 'Método não permitido.');
  if (!row.active)
    throw new HttpError(
      409,
      'Cadastro arquivado. Confira o contato antes de preparar uma mensagem.',
    );
  const kind = z
    .enum(['thanks', 'feedback', 'prices'])
    .parse(u.searchParams.get('kind') || 'thanks');
  const record = row.record_data
    ? (JSON.parse(String(row.record_data)) as VisitRecord)
    : null;
  if (kind === 'thanks' && !record)
    throw new HttpError(409, 'Registre a visita antes de agradecer.');
  if (kind === 'feedback' && !record?.samples.length)
    throw new HttpError(
      409,
      'Este contato ainda não tem amostras registradas nesta visita.',
    );
  const profile = await env
    .DB!.prepare(
      'SELECT display_name FROM display_profiles WHERE organization_id=? AND id=?',
    )
    .bind(a.organization_id, a.user_id)
    .first<{ display_name: string }>();
  const signature = profile?.display_name.trim() || '';
  let message = 'Olá, ' + String(row.customer_name) + '!';
  if (kind === 'thanks')
    message +=
      ' Obrigada por nos receber na visita de apresentação. Ficamos à disposição por aqui.';
  if (kind === 'feedback')
    message +=
      ' O que achou das amostras? Gostaria de compartilhar sua opinião com a gente?';
  if (kind === 'prices') {
    const kits = (
      await env
        .DB!.prepare(
          'SELECT * FROM kits WHERE organization_id=? AND active=1 AND price_cents>0 ORDER BY weight_grams,units_per_kit LIMIT 31',
        )
        .bind(a.organization_id)
        .all<Kit>()
    ).results;
    const variants = (
      await env
        .DB!.prepare(
          'SELECT p.name,v.label,v.weight_grams,v.units_per_box,v.price_cents FROM product_variants v JOIN products p ON p.organization_id=v.organization_id AND p.id=v.product_id WHERE v.organization_id=? AND v.active=1 AND p.active=1 AND v.price_cents>0 ORDER BY p.name,v.weight_grams,v.units_per_box LIMIT 31',
        )
        .bind(a.organization_id)
        .all<{
          name: string;
          label: string;
          weight_grams: number;
          units_per_box: number;
          price_cents: number;
        }>()
    ).results;
    const money = (n: number) =>
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(n / 100);
    const lines = [
      ...kits.map((k) => kitLabel(k) + ' — ' + money(k.price_cents)),
      ...variants.map(
        (v) =>
          v.name +
          ' · ' +
          v.label +
          ' · ' +
          v.weight_grams +
          ' g · ' +
          v.units_per_box +
          ' un. — ' +
          money(v.price_cents),
      ),
    ];
    if (!lines.length)
      throw new HttpError(
        409,
        'Não há kits ou embalagens com preço ativo cadastrado.',
      );
    message +=
      ' Seguem as opções com preços cadastrados:\n\n' +
      lines.slice(0, 30).join('\n') +
      (lines.length > 30 ? '\n\nPara outras opções, me chame por aqui.' : '');
  }
  if (signature) message += '\n\n' + signature;
  return json({
    message,
    phone: visiblePhone(row.phone),
    signature,
    has_name: !!signature,
    contact_status: JSON.parse(String(row.prospect_data || '{}')).stage || '',
  });
}

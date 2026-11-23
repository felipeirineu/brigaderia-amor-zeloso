import { readKitItems } from './kit-order-items';
import { z } from 'zod';
import { HttpError, json, type Actor } from './security';
import { readRecipes } from './recipes';
import {
  estimateRecipe,
  safeQuantity,
  type RecipeEstimate,
} from './recipe-domain';
import { flavorLines, type FlavorLine } from './flavor-lines';
export async function orderCosts(
  req: Request,
  db: D1Database,
  a: Actor,
  id?: string,
) {
  if (req.method !== 'GET') throw new HttpError(405, 'Método não permitido.');
  if (!z.uuid().safeParse(id).success)
    throw new HttpError(404, 'Pedido não encontrado.');
  const org = a.organization_id;
  const order = await db
    .prepare(
      'SELECT id,version FROM orders WHERE organization_id=? AND id=? AND active=1',
    )
    .bind(org, id)
    .first<{ id: string; version: number }>();
  if (!order) throw new HttpError(404, 'Pedido não encontrado.');
  const lines = await flavorLines(db, org, [order.id]);
  const estimates = await estimateOrderCosts(db, org, [order.id], lines);
  const current = await db
    .prepare(
      'SELECT version FROM orders WHERE organization_id=? AND id=? AND active=1',
    )
    .bind(org, id)
    .first<{ version: number }>();
  if (current?.version !== order.version)
    throw new HttpError(
      409,
      'Pedido alterado durante o cálculo. Atualize e tente novamente.',
    );
  return json({
    order_id: order.id,
    order_version: order.version,
    basis: 'fichas e custos atuais; custo por doce × unidades',
    ...estimates.get(order.id)!,
  });
}

export async function estimateOrderCosts(
  db: D1Database,
  org: string,
  ids: string[],
  lines: FlavorLine[],
) {
  const results = new Map<string, ReturnType<typeof orderEstimate>>();
  if (!ids.length) return results;
  const recipes = await readRecipes(db, org, { lines });
  const linesByOrder = groupByOrder(lines);
  const kits = lines.some((line) => line.kit_id)
    ? await readKitItems(db, org, ids)
    : [];
  const supplies = kits.length
    ? (
        await db
          .prepare(
            'SELECT id,name,unit,pack_cost_cents,pack_quantity_milli,active FROM supplies WHERE organization_id=? AND id IN(SELECT value FROM json_each(?))',
          )
          .bind(org, JSON.stringify(kits.map((k) => k.packaging_supply_id)))
          .all<{
            id: string;
            name: string;
            unit: string;
            pack_cost_cents: number | null;
            pack_quantity_milli: number;
            active: number;
          }>()
      ).results
    : [];
  const kitsByOrder = groupByOrder(kits);
  const recipeEstimates = new Map<string, RecipeEstimate>();
  for (const id of ids)
    results.set(
      id,
      orderEstimate(
        linesByOrder.get(id) ?? [],
        kitsByOrder.get(id) ?? [],
        supplies,
        recipes,
        recipeEstimates,
      ),
    );
  return results;
}

function groupByOrder<T extends { order_id: string }>(rows: T[]) {
  const result = new Map<string, T[]>();
  for (const row of rows) {
    const group = result.get(row.order_id);
    if (group) group.push(row);
    else result.set(row.order_id, [row]);
  }
  return result;
}

function orderEstimate(
  lines: FlavorLine[],
  kits: Awaited<ReturnType<typeof readKitItems>>,
  supplies: {
    id: string;
    name: string;
    unit: string;
    pack_cost_cents: number | null;
    pack_quantity_milli: number;
    active: number;
  }[],
  recipes: Awaited<ReturnType<typeof readRecipes>>,
  recipeEstimates: Map<string, RecipeEstimate>,
) {
  const missing = new Set<string>();
  const sum = (values: number[], label: string) => {
    try {
      return safeQuantity(values.reduce((n, c) => n + BigInt(c), 0n));
    } catch {
      missing.add('Cálculo excede o limite: ' + label);
      return null;
    }
  };
  const items = new Map<
    string,
    {
      item_id: string;
      quantity: number;
      mixed: boolean;
      estimated_cost_cents: number | null;
      components: {
        name: string;
        variant_id: string;
        units: number;
        unit_cost_cents: number | null;
        estimated_cost_cents: number | null;
      }[];
    }
  >();
  for (const line of lines) {
    const item = items.get(line.item_id) ?? {
      item_id: line.item_id,
      quantity: line.item_quantity,
      mixed: line.mixed,
      estimated_cost_cents: 0,
      components: [],
    };
    const candidates = recipes.filter(
      (r) =>
        r.active &&
        (line.kit_id
          ? r.product_id === line.product_id &&
            r.weight_grams === line.weight_grams
          : r.variant_id === line.variant_id),
    );
    const recipe =
      line.kit_id && candidates.length !== 1 ? undefined : candidates[0];
    let unitCost: number | null = null,
      cost: number | null = null;
    if (!recipe) missing.add('Sem ficha: ' + line.display_name);
    else if (!recipe.components.length)
      missing.add('Ficha sem insumos: ' + recipe.name);
    else {
      try {
        const key = recipe.id + (line.kit_id ? ':kit' : '');
        let estimate = recipeEstimates.get(key);
        if (!estimate) {
          estimate = estimateRecipe(
            line.kit_id ? { ...recipe, packaging_cents: 0 } : recipe,
            recipe.components,
          );
          recipeEstimates.set(key, estimate);
        }
        unitCost = estimate.unit_cost_cents;
        for (const name of estimate.missing)
          missing.add(recipe.name + ': insumo sem custo ou inativo — ' + name);
        if (unitCost !== null)
          cost = safeQuantity(BigInt(unitCost) * BigInt(line.units));
      } catch {
        missing.add('Cálculo excede o limite: ' + recipe.name);
        unitCost = null;
      }
    }
    item.components.push({
      name: line.display_name,
      variant_id: line.variant_id,
      units: line.units,
      unit_cost_cents: unitCost,
      estimated_cost_cents: cost,
    });
    item.estimated_cost_cents =
      cost === null || item.estimated_cost_cents === null
        ? null
        : sum([item.estimated_cost_cents, cost], 'item do pedido');
    items.set(line.item_id, item);
  }
  for (const kit of kits) {
    const item = items.get(kit.id);
    const supply = supplies.find((s) => s.id === kit.packaging_supply_id);
    if (!supply || supply.unit !== 'unit') {
      missing.add(
        'Embalagem não informada: kit ' +
          kit.units_per_kit +
          ' · ' +
          kit.weight_grams +
          ' g',
      );
      if (item) item.estimated_cost_cents = null;
    } else if (supply.pack_cost_cents === null || !supply.active) {
      missing.add('Embalagem sem custo ou inativa: ' + supply.name);
      if (item) item.estimated_cost_cents = null;
    } else if (item && item.estimated_cost_cents !== null) {
      const cost = safeQuantity(
        (BigInt(kit.quantity) * 1000n * BigInt(supply.pack_cost_cents) +
          BigInt(supply.pack_quantity_milli) -
          1n) /
          BigInt(supply.pack_quantity_milli),
      );
      item.estimated_cost_cents = sum(
        [item.estimated_cost_cents, cost],
        'embalagem do kit',
      );
    }
  }
  const output = [...items.values()];
  if (!output.length) missing.add('Pedido sem itens calculáveis.');
  const incomplete =
    missing.size > 0 || output.some((i) => i.estimated_cost_cents === null);
  const total = incomplete
    ? null
    : sum(
        output.map((i) => i.estimated_cost_cents!),
        'pedido',
      );
  return { missing: [...missing], items: output, estimated_cost_cents: total };
}

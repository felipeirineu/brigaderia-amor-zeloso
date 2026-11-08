import type { ComponentInput, ItemInput, ItemSnapshot } from '../shared/mixed';
import { compositionKey } from '../shared/mixed';
import {
  catalogForItems,
  prepareFromCatalog,
  type CatalogVariant,
} from './mixed';
import { HttpError } from './security';
export interface RecurringItem extends ItemInput {
  id: string;
  template_id: string;
}
export async function recurringMixedSchema(db: D1Database) {
  return !!(await db
    .prepare(
      "SELECT 1 FROM sqlite_schema WHERE type='table' AND name='recurring_mixed_components'",
    )
    .first());
}
export async function recurringItems(
  db: D1Database,
  org: string,
  ids: string[],
) {
  if (!ids.length) return [] as RecurringItem[];
  const mixed = await recurringMixedSchema(db);
  const rows = (
    await db
      .prepare(
        `SELECT id,template_id,variant_id,quantity FROM recurring_items WHERE organization_id=? AND template_id IN(SELECT value FROM json_each(?))${mixed ? ' UNION ALL SELECT id,template_id,variant_id,quantity FROM recurring_mixed_items WHERE organization_id=? AND template_id IN(SELECT value FROM json_each(?))' : ''} ORDER BY template_id,id`,
      )
      .bind(
        org,
        JSON.stringify(ids),
        ...(mixed ? [org, JSON.stringify(ids)] : []),
      )
      .all<RecurringItem>()
  ).results;
  if (mixed && rows.length) {
    const components = (
      await db
        .prepare(
          'SELECT c.item_id,c.variant_id,c.units FROM recurring_mixed_components c JOIN recurring_mixed_items i ON i.organization_id=c.organization_id AND i.id=c.item_id WHERE c.organization_id=? AND i.template_id IN(SELECT value FROM json_each(?)) ORDER BY c.item_id,c.variant_id',
        )
        .bind(org, JSON.stringify(ids))
        .all<ComponentInput & { item_id: string }>()
    ).results;
    const groups = new Map<string, ComponentInput[]>();
    for (const c of components) {
      const group = groups.get(c.item_id) ?? [];
      group.push({ variant_id: c.variant_id, units: c.units });
      groups.set(c.item_id, group);
    }
    // Uma linha mista sem componentes é inválida, não pode virar item simples.
    const mixedIds = new Set(
      (
        await db
          .prepare(
            'SELECT id FROM recurring_mixed_items WHERE organization_id=? AND template_id IN(SELECT value FROM json_each(?))',
          )
          .bind(org, JSON.stringify(ids))
          .all<{ id: string }>()
      ).results.map((i) => i.id),
    );
    for (const row of rows)
      if (mixedIds.has(row.id)) row.components = groups.get(row.id) ?? [];
  }
  return rows;
}
export function prepareRecurring(
  input: ItemInput[],
  catalog: CatalogVariant[],
  enabled: boolean,
) {
  const ids = new Set(
    input.flatMap((i) => [
      i.variant_id,
      ...(i.components ?? []).map((c) => c.variant_id),
    ]),
  );
  const inactive = catalog.find(
    (v) => ids.has(v.id) && (!v.active || !v.product_active),
  );
  if (inactive)
    throw new HttpError(
      400,
      'Variante ' + inactive.name + ' — ' + inactive.label + ' inativa.',
    );
  for (const i of input) {
    if (!i.components) continue;
    if (!enabled)
      throw new HttpError(
        503,
        'Caixas mistas em modelos aguardam a migração 0016 e a ativação existente.',
      );
    if (!i.components.length)
      throw new HttpError(400, 'Composição do modelo ausente.');
    const dominant = [...i.components].sort(
      (a, b) => b.units - a.units || a.variant_id.localeCompare(b.variant_id),
    )[0];
    if (dominant.variant_id !== i.variant_id)
      throw new HttpError(
        400,
        'A embalagem deve usar o sabor com mais unidades.',
      );
    const base = catalog.find((v) => v.id === i.variant_id);
    if (
      i.components.some(
        (c) =>
          catalog.find((v) => v.id === c.variant_id)?.units_per_box !==
          base?.units_per_box,
      )
    )
      throw new HttpError(400, 'Os sabores devem usar a mesma embalagem.');
  }
  return prepareFromCatalog(input, [], catalog);
}
export async function recurringDefaults(
  db: D1Database,
  org: string,
  ids: string[],
  enabled: boolean,
) {
  const items = await recurringItems(db, org, ids),
    catalog = await catalogForItems(db, org, items);
  return ids.map((id) => {
    const lines = items.filter((i) => i.template_id === id);
    let valid = lines.length > 0;
    try {
      prepareRecurring(lines, catalog, enabled);
    } catch {
      valid = false;
    }
    return {
      id,
      valid,
      items: lines.map(({ variant_id, quantity, components }) => ({
        variant_id,
        quantity,
        ...(components ? { components } : {}),
      })),
    };
  });
}
export function writeRecurringMixed(
  db: D1Database,
  org: string,
  template: string,
  items: ItemSnapshot[],
  guard: string,
  args: unknown[],
) {
  const mixed = items.filter((i) => i.components?.length);
  return [
    db
      .prepare(
        `DELETE FROM recurring_mixed_items WHERE organization_id=? AND template_id=? AND ${guard}`,
      )
      .bind(org, template, ...args),
    db
      .prepare(
        `INSERT INTO recurring_mixed_items(organization_id,id,template_id,variant_id,quantity,composition_key) SELECT ?,json_extract(value,'$.id'),?,json_extract(value,'$.variant_id'),json_extract(value,'$.quantity'),json_extract(value,'$.composition_key') FROM json_each(?) WHERE ${guard}`,
      )
      .bind(
        org,
        template,
        JSON.stringify(
          mixed.map((i) => ({ ...i, composition_key: compositionKey(i) })),
        ),
        ...args,
      ),
    db
      .prepare(
        `INSERT INTO recurring_mixed_components(organization_id,item_id,variant_id,units) SELECT ?,json_extract(value,'$.item_id'),json_extract(value,'$.variant_id'),json_extract(value,'$.units') FROM json_each(?) WHERE ${guard}`,
      )
      .bind(
        org,
        JSON.stringify(
          mixed.flatMap((i) =>
            i.components!.map((c) => ({ ...c, item_id: i.id })),
          ),
        ),
        ...args,
      ),
  ];
}

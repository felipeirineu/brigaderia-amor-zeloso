import { priceForMargin } from './costing';
import type { Kit } from './kits';
export interface SizeFinish {
  weight_grams: number;
  quantity_milli: number;
  estimated: boolean;
}
export interface WeightComponent {
  supply_id: string;
  group: 'dough' | 'batch' | 'finish';
  quantity_milli: number;
  sizes: SizeFinish[];
}
export interface WeightRecipeData {
  reference_yield: number;
  reference_dough_milli: number;
  reference_confirmed: boolean;
  mass_milli: number | null;
  margin_bps: number;
  measured: {
    weight_grams: number;
    dough_milli: number;
    yield_units: number;
  }[];
  components: WeightComponent[];
}
export interface CostingSettings {
  overhead_bps: number;
  ifood_divisor_bps: number;
  ifood_packaging_supply_id: string | null;
  ifood_label_supply_id: string | null;
  ifood_bag_supply_id: string | null;
  optional_supply_ids: string[];
  liners: { weight_grams: number; supply_id: string | null }[];
}
export interface WeightSupply {
  id: string;
  name: string;
  unit: 'g' | 'ml' | 'unit';
  pack_quantity_milli: number;
  pack_cost_cents: number | null;
  active: number;
}
export const emptyWeightRecipe = (): WeightRecipeData => ({
  reference_yield: 16,
  reference_dough_milli: 26000,
  reference_confirmed: false,
  mass_milli: null,
  margin_bps: 0,
  measured: [],
  components: [],
});
export const defaultCostingSettings = (): CostingSettings => ({
  overhead_bps: 2000,
  ifood_divisor_bps: 7400,
  ifood_packaging_supply_id: null,
  ifood_label_supply_id: null,
  ifood_bag_supply_id: null,
  optional_supply_ids: [],
  liners: [15, 23, 30].map((weight_grams) => ({
    weight_grams,
    supply_id: null,
  })),
});
const ceil = (n: bigint, d: bigint) => {
  if (n < 0n || d <= 0n) throw Error('Divisão inválida.');
  return bounded((n + d - 1n) / d);
};
const bounded = (n: bigint) => {
  if (n < 0n || n > 1000000000000n) throw Error('Estimativa excede o limite.');
  return Number(n);
};
export function yieldByWeight(
  data: WeightRecipeData,
  weight: number,
  doughMilli: number,
) {
  if (!Number.isSafeInteger(doughMilli) || doughMilli <= 0)
    throw Error('Informe o peso de massa no kit.');
  const measured = data.measured.find(
    (m) => m.weight_grams === weight && m.dough_milli === doughMilli,
  );
  if (measured)
    return {
      units: measured.yield_units,
      estimated: false,
      source: 'medido' as const,
    };
  const total =
    data.mass_milli === null
      ? BigInt(data.reference_yield) * BigInt(data.reference_dough_milli)
      : BigInt(data.mass_milli);
  const units = bounded(total / BigInt(doughMilli));
  if (!units) throw Error('Massa insuficiente para um doce deste tamanho.');
  return {
    units,
    estimated:
      data.mass_milli !== null ||
      !data.reference_confirmed ||
      doughMilli !== data.reference_dough_milli,
    source:
      data.mass_milli === null
        ? ('referência' as const)
        : ('massa total' as const),
  };
}
/** Sugestão em milésimos de unidade, nunca aplicada ou persistida automaticamente. */
export function finishSuggestion(quantity: number, from: number, to: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 0 || from <= 0 || to <= 0)
    throw Error('Acabamento inválido.');
  const result = Math.ceil(quantity * Math.pow(to / from, 2 / 3));
  if (!Number.isSafeInteger(result) || result > 1000000000000)
    throw Error('Acabamento excede o limite.');
  return result;
}
export function ifoodPrice(
  price: number,
  packaging: number,
  label: number,
  bag: number,
  divisorBps: number,
) {
  if (
    ![price, packaging, label, bag].every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    ) ||
    !Number.isInteger(divisorBps) ||
    divisorBps < 1 ||
    divisorBps > 10000
  )
    throw Error('Preço/canal inválido.');
  const numerator = bounded(
    BigInt(price) + BigInt(packaging) + BigInt(label) + BigInt(bag),
  );
  return {
    numerator_cents: numerator,
    price_cents: ceil(BigInt(numerator) * 10000n, BigInt(divisorBps)),
    divisor_bps: divisorBps,
  };
}
/** Leitura pura: custos atuais, sem pedidos, preços de catálogo ou efeitos financeiros. */
export function calculateWeightKit(
  data: WeightRecipeData,
  settings: CostingSettings,
  kit: Kit,
  supplies: WeightSupply[],
  optional: string[] = [],
  margin = data.margin_bps,
) {
  const byId = new Map(supplies.map((s) => [s.id, s])),
    missing: string[] = [],
    details: {
      group: string;
      name: string;
      cents: number | null;
      estimated: boolean;
    }[] = [],
    suggestions: {
      supply_id: string;
      name: string;
      weight_grams: number;
      quantity_milli: number;
      from_weight: number;
    }[] = [];
  function cost(
    id: string | null,
    quantity: number,
    label: string,
    unitOnly = false,
    errors = missing,
  ): number | null {
    if (quantity === 0) return 0;
    const s = id ? byId.get(id) : undefined;
    if (
      !s ||
      !s.active ||
      s.pack_cost_cents === null ||
      (unitOnly && s.unit !== 'unit')
    ) {
      errors.push(
        `${label}: ${s?.name ?? 'insumo não configurado'} — preço/unidade/atividade pendente`,
      );
      return null;
    }
    return ceil(
      BigInt(quantity) * BigInt(s.pack_cost_cents),
      BigInt(s.pack_quantity_milli),
    );
  }
  const sum = (values: (number | null)[]) =>
    values.some((v) => v === null)
      ? null
      : bounded(values.reduce<bigint>((n, v) => n + BigInt(v!), 0n));
  let yieldResult: ReturnType<typeof yieldByWeight> | null = null;
  try {
    if (
      kit.dough_weight_grams === null ||
      kit.dough_weight_grams > kit.weight_grams
    )
      throw Error('Informe um peso de massa válido no kit.');
    yieldResult = yieldByWeight(
      data,
      kit.weight_grams,
      kit.dough_weight_grams * 1000,
    );
  } catch (e) {
    missing.push((e as Error).message);
  }
  const batch = data.components
    .filter((c) => c.group !== 'finish')
    .map((c) => {
      const cents = cost(
        c.supply_id,
        c.quantity_milli,
        c.group === 'dough' ? 'Massa' : 'Custo por receita',
      );
      details.push({
        group: c.group,
        name: byId.get(c.supply_id)?.name ?? 'Insumo indisponível',
        cents,
        estimated: false,
      });
      return cents;
    });
  const hasDough = data.components.some((c) => c.group === 'dough');
  if (!hasDough) missing.push('Massa não informada na ficha.');
  const batchCost = hasDough ? sum(batch) : null,
    massUnit =
      batchCost === null || !yieldResult
        ? null
        : ceil(BigInt(batchCost), BigInt(yieldResult.units));
  const finish = data.components
    .filter((c) => c.group === 'finish')
    .map((c) => {
      const exact = c.sizes.find((s) => s.weight_grams === kit.weight_grams),
        name = byId.get(c.supply_id)?.name ?? 'Acabamento';
      if (!exact) {
        const from = [...c.sizes].sort(
          (a, b) =>
            Math.abs(Math.log(a.weight_grams / kit.weight_grams)) -
            Math.abs(Math.log(b.weight_grams / kit.weight_grams)),
        )[0];
        if (from)
          suggestions.push({
            supply_id: c.supply_id,
            name,
            weight_grams: kit.weight_grams,
            quantity_milli: finishSuggestion(
              from.quantity_milli,
              from.weight_grams,
              kit.weight_grams,
            ),
            from_weight: from.weight_grams,
          });
        missing.push(
          `${name}: confirme a quantidade para ${kit.weight_grams} g`,
        );
        return null;
      }
      const cents = cost(c.supply_id, exact.quantity_milli, 'Acabamento');
      details.push({
        group: 'finish',
        name,
        cents,
        estimated: exact.estimated,
      });
      return cents;
    });
  const liner =
    settings.liners.find((s) => s.weight_grams === kit.weight_grams)
      ?.supply_id ?? null;
  const linerCost = cost(liner, 1000, 'Forminha por tamanho', true);
  details.push({
    group: 'liner',
    name: byId.get(liner ?? '')?.name ?? 'Forminha',
    cents: linerCost,
    estimated: false,
  });
  const extra = optional.map((id) => {
    if (!settings.optional_supply_ids.includes(id))
      throw Error('Opcional não autorizado.');
    const cents = cost(id, 1000, 'Opcional por doce', true);
    details.push({
      group: 'optional',
      name: byId.get(id)?.name ?? 'Opcional',
      cents,
      estimated: false,
    });
    return cents;
  });
  const unit = sum([massUnit, ...finish, linerCost, ...extra]),
    packaging = cost(kit.packaging_supply_id, 1000, 'Embalagem do kit', true);
  const calculated =
    unit === null || packaging === null
      ? null
      : bounded(BigInt(unit) * BigInt(kit.units_per_kit) + BigInt(packaging));
  const adjusted =
    calculated === null
      ? null
      : ceil(
          BigInt(calculated) * BigInt(10000 + settings.overhead_bps),
          10000n,
        );
  const suggested = adjusted === null ? null : priceForMargin(adjusted, margin);
  const channelMissing: string[] = [],
    channelPack = cost(
      settings.ifood_packaging_supply_id ?? kit.packaging_supply_id,
      1000,
      'Embalagem iFood',
      true,
      channelMissing,
    ),
    channelLabel = cost(
      settings.ifood_label_supply_id,
      1000,
      'Etiqueta iFood',
      true,
      channelMissing,
    ),
    channelBag = cost(
      settings.ifood_bag_supply_id,
      1000,
      'Sacola iFood',
      true,
      channelMissing,
    );
  const channel = (price: number | null) =>
    price === null ||
    channelPack === null ||
    channelLabel === null ||
    channelBag === null
      ? null
      : ifoodPrice(
          price,
          channelPack,
          channelLabel,
          channelBag,
          settings.ifood_divisor_bps,
        );
  return {
    kit,
    yield: yieldResult,
    recipe_cents: batchCost,
    mass_unit_cents: massUnit,
    unit_cost_cents: unit,
    packaging_cents: packaging,
    calculated_cents: calculated,
    overhead_bps: settings.overhead_bps,
    adjusted_cents: adjusted,
    suggested_price_cents: suggested,
    margin_bps: margin,
    table_margin_bps:
      adjusted === null || kit.price_cents === 0
        ? null
        : Math.floor(((kit.price_cents - adjusted) * 10000) / kit.price_cents),
    missing: [...new Set(missing)],
    details,
    suggestions,
    ifood: {
      table: channel(kit.price_cents),
      suggested: channel(suggested),
      packaging_cents: channelPack,
      label_cents: channelLabel,
      bag_cents: channelBag,
      fee_bps: 10000 - settings.ifood_divisor_bps,
      missing: [...new Set(channelMissing)],
      assumption: '1 kit por pedido; 1 sacola de envio por pedido.',
    },
  };
}

// Cadastro inicial a partir de uma planilha: sabores (produtos), insumos e
// fichas. Só lê e valida; a gravação usa as APIs privadas já existentes, com
// as mesmas regras e permissões do cadastro manual. Nada aqui grava dados.
import { suggestPhoto, flavorPhotos, type FlavorPhoto } from './flavors';

export const CATALOG_SHEETS = {
  flavors: 'Sabores',
  supplies: 'Insumos',
  recipes: 'Fichas',
  customers: 'Clientes',
} as const;

export interface FlavorRow {
  line: number;
  name: string;
  description: string;
  photo_key: FlavorPhoto | null;
  variant: {
    label: string;
    weight_grams: number;
    units_per_box: number;
    price_cents: number;
  };
}
export interface SupplyRow {
  line: number;
  name: string;
  unit: 'g' | 'ml' | 'unit';
  pack_quantity_milli: number;
  pack_cost_cents: number | null;
}
export interface RecipeRow {
  name: string;
  flavor: string;
  yield_units: number;
  overhead_cents: number;
  packaging_cents: number;
  labor_cents: number;
  margin_bps: number;
  components: { line: number; supply: string; quantity_milli: number }[];
}
export interface CatalogPlan {
  flavors: FlavorRow[];
  supplies: SupplyRow[];
  recipes: RecipeRow[];
  problems: string[];
}

export const plain = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Aceita 30,3 / 30.3 / 1.234,56 / R$ 6,89. Vazio devolve null. */
export function parseDecimal(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  let s = String(value)
    .replace(/R\$|\s/g, '')
    .trim();
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}
const toMilli = (n: number) => Math.round(n * 1000);
const toCents = (n: number) => Math.round(n * 100);

/** Cabeçalho flexível: ignora acento, caixa, espaços e texto entre parênteses. */
function table(rows: unknown[][] | undefined) {
  if (!rows?.length) return { header: [] as string[], body: [] as unknown[][] };
  const header = rows[0].map((h) =>
    plain(h)
      .replace(/\(.*?\)/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, ''),
  );
  const body = rows
    .slice(1)
    .map(
      (r, i) =>
        Object.assign(r, { line: i + 2 }) as unknown[] & { line: number },
    )
    .filter((r) => r.some((c) => String(c ?? '').trim()));
  return { header, body };
}
function pick(header: string[], row: unknown[], ...names: string[]) {
  for (const n of names) {
    const i = header.indexOf(n);
    if (i >= 0) return row[i];
  }
  return undefined;
}
const text = (v: unknown) => String(v ?? '').trim();

const units: Record<string, SupplyRow['unit']> = {
  g: 'g',
  grama: 'g',
  gramas: 'g',
  ml: 'ml',
  mililitro: 'ml',
  mililitros: 'ml',
  un: 'unit',
  'un.': 'unit',
  unidade: 'unit',
  unidades: 'unit',
  unit: 'unit',
};

export function planCatalog(sheets: {
  flavors?: unknown[][];
  supplies?: unknown[][];
  recipes?: unknown[][];
}): CatalogPlan {
  const problems: string[] = [];
  const bad = (sheet: string, line: number, msg: string) =>
    problems.push(`${sheet}, linha ${line}: ${msg}`);

  // Sabores: um produto por sabor, com uma embalagem (variante).
  const flavors: FlavorRow[] = [];
  {
    const S = CATALOG_SHEETS.flavors,
      { header, body } = table(sheets.flavors);
    if (sheets.flavors && !header.includes('nome'))
      problems.push(`${S}: falta a coluna "nome".`);
    for (const row of body) {
      const line = (row as unknown as { line: number }).line,
        name = text(pick(header, row, 'nome', 'sabor')),
        weight = parseDecimal(pick(header, row, 'peso_g', 'peso')),
        unitsPerBox = parseDecimal(
          pick(header, row, 'unidades', 'unidades_por_caixa'),
        ),
        price = parseDecimal(pick(header, row, 'preco', 'preco_da_embalagem')),
        photoText = plain(pick(header, row, 'foto'));
      if (!name) {
        bad(S, line, 'nome vazio.');
        continue;
      }
      if (!weight || !Number.isInteger(weight) || weight < 1)
        bad(S, line, 'peso em gramas inteiro (ex.: 30).');
      else if (
        !unitsPerBox ||
        !Number.isInteger(unitsPerBox) ||
        unitsPerBox < 1
      )
        bad(S, line, 'unidades por caixa inteiras (ex.: 12).');
      else if (price === null || Number.isNaN(price) || price < 0)
        bad(S, line, 'preço da caixa (ex.: 42,00).');
      else {
        const photo = photoText
          ? (flavorPhotos.find((k) => k === photoText) ??
            suggestPhoto(photoText))
          : suggestPhoto(name);
        if (photoText && !photo)
          bad(S, line, `foto "${photoText}" não existe.`);
        flavors.push({
          line,
          name,
          description: text(pick(header, row, 'descricao')),
          photo_key: photo,
          variant: {
            label:
              text(pick(header, row, 'embalagem')) ||
              `Caixa ${unitsPerBox} un.`,
            weight_grams: weight,
            units_per_box: unitsPerBox,
            price_cents: toCents(price),
          },
        });
      }
    }
  }

  // Insumos.
  const supplies: SupplyRow[] = [];
  {
    const S = CATALOG_SHEETS.supplies,
      { header, body } = table(sheets.supplies);
    for (const row of body) {
      const line = (row as unknown as { line: number }).line,
        name = text(pick(header, row, 'nome', 'nome_do_insumo')),
        unitText = plain(pick(header, row, 'unidade', 'unidade_de_referencia'))
          .replace(/\(.*?\)/g, '')
          .trim(),
        qty = parseDecimal(
          pick(header, row, 'quantidade', 'quantidade_por_embalagem'),
        ),
        price = parseDecimal(pick(header, row, 'preco', 'preco_da_embalagem'));
      if (!name) continue; // linhas de anotação sem nome são ignoradas
      const unit = units[unitText];
      if (!unit) {
        // "Gás" e outras anotações sem unidade não são insumos.
        if (unitText === '' || unitText === '—' || unitText === '-') continue;
        bad(S, line, `unidade "${unitText}" (use g, mL ou unidades).`);
        continue;
      }
      if (!qty || Number.isNaN(qty) || qty <= 0 || toMilli(qty) < 1)
        bad(S, line, 'quantidade por embalagem maior que zero.');
      else if (price !== null && (Number.isNaN(price) || price < 0))
        bad(S, line, 'preço inválido (deixe vazio se não souber).');
      else
        supplies.push({
          line,
          name,
          unit,
          pack_quantity_milli: toMilli(qty),
          pack_cost_cents: price === null ? null : toCents(price),
        });
    }
  }

  // Fichas: uma linha por insumo; rendimento e custos podem vir em linhas
  // próprias ("Rendimento do lote", "Outros custos por lote") ou em colunas.
  const recipes = new Map<string, RecipeRow>();
  {
    const S = CATALOG_SHEETS.recipes,
      { header, body } = table(sheets.recipes);
    for (const row of body) {
      const line = (row as unknown as { line: number }).line,
        flavor = text(pick(header, row, 'ficha', 'ficha_sabor', 'sabor')),
        item = text(pick(header, row, 'insumo')),
        qty = parseDecimal(
          pick(header, row, 'quantidade', 'quantidade_no_lote'),
        );
      if (!flavor) continue;
      if (!item || item.startsWith('(')) continue; // receita ainda em branco
      const r =
        recipes.get(plain(flavor)) ??
        ({
          name: flavor,
          flavor,
          yield_units: 0,
          overhead_cents: 0,
          packaging_cents: 0,
          labor_cents: 0,
          margin_bps: 0,
          components: [],
        } as RecipeRow);
      recipes.set(plain(flavor), r);
      const key = plain(item);
      if (key.startsWith('rendimento')) {
        if (!qty || !Number.isInteger(qty) || qty < 1)
          bad(
            S,
            line,
            `rendimento de "${flavor}" em doces inteiros (ex.: 16).`,
          );
        else r.yield_units = qty;
      } else if (key.startsWith('outros custos')) {
        if (qty === null || Number.isNaN(qty) || qty < 0)
          bad(S, line, 'outros custos por lote em reais (ex.: 0,74).');
        else r.overhead_cents = toCents(qty);
      } else if (key.startsWith('embalagens por lote')) {
        if (qty !== null && !Number.isNaN(qty) && qty >= 0)
          r.packaging_cents = toCents(qty);
      } else if (key.startsWith('mao de obra')) {
        if (qty !== null && !Number.isNaN(qty) && qty >= 0)
          r.labor_cents = toCents(qty);
      } else if (key.startsWith('margem')) {
        if (qty !== null && !Number.isNaN(qty) && qty >= 0 && qty <= 95)
          r.margin_bps = Math.round(qty * 100);
        else bad(S, line, 'margem entre 0 e 95 (%).');
      } else if (!qty || Number.isNaN(qty) || qty <= 0)
        bad(S, line, `quantidade de "${item}" maior que zero.`);
      else if (r.components.some((c) => plain(c.supply) === key))
        bad(S, line, `"${item}" repetido na ficha ${flavor}.`);
      else
        r.components.push({ line, supply: item, quantity_milli: toMilli(qty) });
    }
  }
  for (const r of recipes.values()) {
    if (!r.components.length)
      problems.push(
        `${CATALOG_SHEETS.recipes}: ficha "${r.name}" sem insumos.`,
      );
    if (!r.yield_units)
      problems.push(
        `${CATALOG_SHEETS.recipes}: ficha "${r.name}" sem "Rendimento do lote".`,
      );
  }

  // Duplicados dentro do arquivo.
  const dup = (list: { name: string }[], sheet: string) => {
    const seen = new Set<string>();
    for (const x of list) {
      if (seen.has(plain(x.name)))
        problems.push(`${sheet}: "${x.name}" aparece mais de uma vez.`);
      seen.add(plain(x.name));
    }
  };
  dup(flavors, CATALOG_SHEETS.flavors);
  dup(supplies, CATALOG_SHEETS.supplies);
  return {
    flavors,
    supplies,
    recipes: [...recipes.values()].filter(
      (r) => r.components.length && r.yield_units,
    ),
    problems,
  };
}

/** Liga fichas a sabores e insumos (do arquivo ou já cadastrados). */
export function resolveRecipes(
  plan: CatalogPlan,
  knownFlavors: string[],
  knownSupplies: string[],
) {
  const flavorSet = new Set(knownFlavors.map(plain)),
    supplySet = new Set(knownSupplies.map(plain));
  const problems: string[] = [];
  for (const r of plan.recipes) {
    if (!flavorSet.has(plain(r.flavor)))
      problems.push(
        `Ficha "${r.name}": sabor não encontrado em Sabores nem no app.`,
      );
    for (const c of r.components)
      if (!supplySet.has(plain(c.supply)))
        problems.push(
          `Ficha "${r.name}", linha ${c.line}: insumo "${c.supply}" não encontrado em Insumos nem no app.`,
        );
  }
  return problems;
}

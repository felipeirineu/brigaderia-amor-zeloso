/** Produção do Hoje em números inteiros: doces por sabor e caixas à parte. */
export interface ProductionLine {
  day: string;
  name: string;
  label: string;
  weight_grams: number;
  units_per_box: number;
  units: number;
  photo_key: string | null;
}
export interface PackagingLine {
  day: string;
  weight_grams: number;
  units_per_box: number;
  boxes: number;
}
export interface ProductionFlavor {
  key: string;
  name: string;
  label: string;
  photo_key: string | null;
  units: number;
  /** Mostra a variante só quando o mesmo produto aparece com mais de uma. */
  showLabel: boolean;
  /** Onde os doces vão, por capacidade da embalagem (maior primeiro). */
  parts: { units_per_box: number; units: number }[];
}
export interface ProductionGroup {
  day: string;
  weight_grams: number;
  units: number;
  flavors: ProductionFlavor[];
  packaging: { units_per_box: number; boxes: number }[];
}

export function productionGroups(
  lines: readonly ProductionLine[],
  packaging: readonly PackagingLine[] = [],
): ProductionGroup[] {
  const labels = new Map<string, Set<string>>();
  for (const l of lines)
    labels.set(l.name, (labels.get(l.name) ?? new Set()).add(l.label));
  const groups = new Map<string, ProductionGroup>();
  const group = (day: string, weight: number) => {
    const key = day + '|' + weight;
    let g = groups.get(key);
    if (!g) {
      g = { day, weight_grams: weight, units: 0, flavors: [], packaging: [] };
      groups.set(key, g);
    }
    return g;
  };
  for (const line of lines) {
    const g = group(line.day, line.weight_grams);
    const key = line.name + '|' + line.label;
    let flavor = g.flavors.find((f) => f.key === key);
    if (!flavor) {
      flavor = {
        key,
        name: line.name,
        label: line.label,
        photo_key: line.photo_key,
        units: 0,
        showLabel: !!line.label && (labels.get(line.name)?.size ?? 0) > 1,
        parts: [],
      };
      g.flavors.push(flavor);
    }
    flavor.photo_key ??= line.photo_key;
    flavor.units += line.units;
    g.units += line.units;
    const part = flavor.parts.find(
      (p) => p.units_per_box === line.units_per_box,
    );
    if (part) part.units += line.units;
    else
      flavor.parts.push({
        units_per_box: line.units_per_box,
        units: line.units,
      });
  }
  for (const p of packaging) {
    if (!p.boxes) continue;
    const g = group(p.day, p.weight_grams);
    const same = g.packaging.find((x) => x.units_per_box === p.units_per_box);
    if (same) same.boxes += p.boxes;
    else g.packaging.push({ units_per_box: p.units_per_box, boxes: p.boxes });
  }
  return [...groups.values()]
    .map((g) => ({
      ...g,
      flavors: g.flavors
        .map((f) => ({
          ...f,
          parts: f.parts.sort((a, b) => b.units_per_box - a.units_per_box),
        }))
        .sort((a, b) => b.units - a.units || a.name.localeCompare(b.name)),
      packaging: g.packaging.sort((a, b) => b.units_per_box - a.units_per_box),
    }))
    .sort((a, b) =>
      a.day === b.day
        ? b.weight_grams - a.weight_grams
        : a.day.localeCompare(b.day),
    );
}

/** "25 nas caixas de 12 · 10 avulsos"; com um só destino, sem o número. */
export function partsText(parts: ProductionFlavor['parts']) {
  const place = (n: number) => (n === 1 ? 'avulsos' : `nas caixas de ${n}`);
  if (parts.length === 1) return place(parts[0].units_per_box);
  return parts.map((p) => `${p.units} ${place(p.units_per_box)}`).join(' · ');
}

export function packagingText(p: { units_per_box: number; boxes: number }) {
  return p.units_per_box === 1
    ? { name: 'Avulso', value: `${p.boxes} un.` }
    : {
        name: `Caixa de ${p.units_per_box}`,
        value: `${p.boxes} ${p.boxes === 1 ? 'caixa' : 'caixas'}`,
      };
}

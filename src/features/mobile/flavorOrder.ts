export type Popularity = Record<string, { customer: number; total: number }>;
export function sortFlavors<T extends { id: string }>(
  products: T[],
  ranking: Popularity = {},
  manual: string[] = [],
  base: string[] = [],
) {
  const fallback = (id: string) => {
    const m = manual.indexOf(id);
    return m >= 0
      ? m
      : manual.length + (base.indexOf(id) < 0 ? base.length : base.indexOf(id));
  };
  return [...products].sort(
    (a, b) =>
      (ranking[b.id]?.customer ?? 0) - (ranking[a.id]?.customer ?? 0) ||
      (ranking[b.id]?.total ?? 0) - (ranking[a.id]?.total ?? 0) ||
      fallback(a.id) - fallback(b.id),
  );
}
export const flavorOrderKey = 'az-flavor-order';
export function readFlavorOrder(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(flavorOrderKey) || '[]');
    return Array.isArray(value)
      ? value.filter((v) => typeof v === 'string').slice(0, 200)
      : [];
  } catch {
    return [];
  }
}

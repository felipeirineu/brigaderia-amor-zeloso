// Fotos privadas dos sabores (catálogo de 08/11/2026). `coco` e `casadinho` são
// as chaves antigas de Beijinho e Prestígio (sabores renomeados): continuam
// válidas para produtos já cadastrados e mostram a foto nova.
export const flavorPhotos = [
  'tradicional',
  'colorido',
  'amendoim',
  'prestigio',
  'beijinho',
  'cajuzinho',
  'uva',
  'limao',
  'caipirinha',
  'coco',
  'casadinho',
] as const;
export type FlavorPhoto = (typeof flavorPhotos)[number];
export const flavorNames: Record<FlavorPhoto, string> = {
  tradicional: 'Brigadeiro',
  colorido: 'Brigadeiro Colorido',
  amendoim: 'Brigadeiro com Amendoim',
  prestigio: 'Prestígio',
  beijinho: 'Beijinho',
  cajuzinho: 'Cajuzinho',
  uva: 'Surpresa de Uva',
  limao: 'Limão',
  caipirinha: 'Caipirinha',
  coco: 'Beijinho (antigo Côco)',
  casadinho: 'Prestígio (antigo Casadinho)',
};
/** Fotos oferecidas na escolha: o catálogo atual, sem as chaves antigas. */
export const catalogPhotos: FlavorPhoto[] = flavorPhotos.filter(
  (k) => k !== 'coco' && k !== 'casadinho',
);
/** Mostra a chave antiga só se o produto ainda estiver com ela. */
export const photoChoices = (current?: string | null): FlavorPhoto[] =>
  current === 'coco' || current === 'casadinho'
    ? [...catalogPhotos, current]
    : catalogPhotos;
const aliases: Record<string, FlavorPhoto> = {
  brigadeiro: 'tradicional',
  tradicional: 'tradicional',
  'brigadeiro tradicional': 'tradicional',
  colorido: 'colorido',
  'brigadeiro colorido': 'colorido',
  amendoim: 'amendoim',
  'com amendoim': 'amendoim',
  'brigadeiro com amendoim': 'amendoim',
  prestigio: 'prestigio',
  beijinho: 'beijinho',
  cajuzinho: 'cajuzinho',
  uva: 'uva',
  'surpresa de uva': 'uva',
  limao: 'limao',
  caipirinha: 'caipirinha',
  coco: 'beijinho',
  casadinho: 'prestigio',
};
export function suggestPhoto(name: string): FlavorPhoto | null {
  const plain = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return aliases[plain] ?? aliases[plain.replace(/^brigadeiro /, '')] ?? null;
}
export const photoURL = (key: string) =>
  '/api/brand/flavors/' + encodeURIComponent(key);

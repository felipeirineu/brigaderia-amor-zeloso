// Fotos privadas dos sabores (catálogo de 08/11/2026). `coco` e `casadinho`
// são fotos antigas, mantidas porque produtos já cadastrados podem usá-las.
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
  coco: 'Côco (foto antiga)',
  casadinho: 'Casadinho (foto antiga)',
};
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
  coco: 'coco',
  casadinho: 'casadinho',
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

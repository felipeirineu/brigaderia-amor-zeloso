export const flavorPhotos = [
  'tradicional',
  'coco',
  'casadinho',
  'cajuzinho',
  'limao',
] as const;
export type FlavorPhoto = (typeof flavorPhotos)[number];
export const flavorNames: Record<FlavorPhoto, string> = {
  tradicional: 'Tradicional',
  coco: 'Côco',
  casadinho: 'Casadinho',
  cajuzinho: 'Cajuzinho',
  limao: 'Limão',
};
export function suggestPhoto(name: string): FlavorPhoto | null {
  const plain = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/^brigadeiro\s+/, '');
  return flavorPhotos.find((p) => p === plain) || null;
}
export const photoURL = (key: string) =>
  '/api/brand/flavors/' + encodeURIComponent(key);

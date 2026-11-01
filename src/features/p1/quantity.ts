export function parseMilli(value: string) {
  if (!/^\d{1,9}(,\d{1,3})?$/.test(value))
    throw Error('Informe quantidade com até três casas decimais e vírgula.');
  const [whole, part = ''] = value.split(',');
  return Number(whole) * 1000 + Number(part.padEnd(3, '0'));
}
export function quantityInput(milli: number) {
  return (milli / 1000)
    .toFixed(3)
    .replace(/\.?0+$/, '')
    .replace('.', ',');
}
export const unitName = (unit: string) =>
  unit === 'unit' ? 'un.' : unit === 'ml' ? 'mL' : 'g';

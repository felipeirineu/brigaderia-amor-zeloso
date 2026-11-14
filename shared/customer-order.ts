export const customerTypes = ['establishment', 'person'] as const;
export type CustomerType = (typeof customerTypes)[number];
export const customerTypeLabels: Record<CustomerType, string> = {
  establishment: 'Estabelecimento',
  person: 'Pessoa',
};
export const occasionValues = [
  '',
  'children_party',
  'birthday',
  'wedding',
  'corporate',
  'gift',
  'other',
] as const;
export type Occasion = (typeof occasionValues)[number];
export const occasionLabels: Record<Occasion, string> = {
  '': 'Sem ocasião definida',
  children_party: 'Festa infantil',
  birthday: 'Aniversário',
  wedding: 'Casamento',
  corporate: 'Brinde/empresa',
  gift: 'Presente',
  other: 'Outra',
};
/** Legado sem coluna continua sendo estabelecimento; nunca inferir pelo nome. */
export function customerType(
  row?: { customer_type?: unknown } | null,
): CustomerType {
  return row?.customer_type === 'person' ? 'person' : 'establishment';
}
export function occasionLabel(value: unknown): string {
  return typeof value === 'string' &&
    value !== '' &&
    Object.hasOwn(occasionLabels, value)
    ? occasionLabels[value as Occasion]
    : '';
}

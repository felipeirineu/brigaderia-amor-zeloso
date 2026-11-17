export type OrderMode = 'simple' | 'full';
/** Preferência antiga auto (ou inválida/ausente) acompanha o novo padrão simples. */
export function orderMode(value: unknown): OrderMode {
  return value === 'full' ? 'full' : 'simple';
}

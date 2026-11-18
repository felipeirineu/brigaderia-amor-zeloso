import { MAX_MONEY } from './numeric';
export interface PromptOptions {
  title?: string;
  action?: string;
  initialValue?: string;
  kind?: 'reason' | 'money';
  maxCents?: number;
  minLength?: number;
}
/** Mesmo formato monetário dos formulários atuais, sem aceitar zero ou exceder o saldo. */
export function promptError(raw: string, options: PromptOptions): string {
  const value = raw.trim();
  if (!value)
    return options.kind === 'money' ? 'Informe um valor.' : 'Informe o motivo.';
  if (options.kind !== 'money' && value.length < (options.minLength ?? 1))
    return `Use pelo menos ${options.minLength} caracteres.`;
  if (options.kind !== 'money')
    return value.length > 500 ? 'Use até 500 caracteres.' : '';
  if (!/^\d{1,7}(,\d{1,2})?$/.test(value))
    return 'Informe o valor com vírgula, como 10,00.';
  const [whole, fraction = ''] = value.split(',');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (cents <= 0) return 'Informe um valor maior que zero.';
  if (cents > (options.maxCents ?? MAX_MONEY))
    return 'O valor excede o saldo disponível.';
  return '';
}

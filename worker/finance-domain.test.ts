import { expect, it } from 'vitest';
import { closingPeriod, emptyTerms } from '../shared/finance';
import { crc16, pixCode, pixSchema, termsSchema } from './finance-domain';
it('quinzenas de dias fixos incluem fevereiro bissexto e virada do mês', () => {
  const t = { ...emptyTerms(), mode: 'credit' as const, due_days: 3 };
  expect(closingPeriod('2028-02-15', t)).toEqual({
    start: '2028-02-01',
    end: '2028-02-15',
    due_on: '2028-02-18',
  });
  expect(closingPeriod('2028-02-16', t)).toEqual({
    start: '2028-02-16',
    end: '2028-02-29',
    due_on: '2028-03-03',
  });
  expect(closingPeriod('2027-02-28', t).end).toBe('2027-02-28');
  expect(closingPeriod('2028-12-31', t).due_on).toBe('2029-01-03');
});
it('14 dias a partir da base, inclusive datas anteriores e virada de ano', () => {
  const t = {
    ...emptyTerms(),
    cycle: 'fourteen_days' as const,
    base_date: '2030-01-07',
    due_days: 0,
  };
  expect(closingPeriod('2030-01-20', t)).toEqual({
    start: '2030-01-07',
    end: '2030-01-20',
    due_on: '2030-01-20',
  });
  expect(closingPeriod('2030-01-21', t).start).toBe('2030-01-21');
  expect(closingPeriod('2030-01-06', t).start).toBe('2029-12-24');
});
it('semanal e mensal independem de fuso e respeitam dias civis', () => {
  expect(
    closingPeriod('2030-01-07', { ...emptyTerms(), cycle: 'weekly' }),
  ).toEqual({ start: '2030-01-07', end: '2030-01-13', due_on: null });
  expect(
    closingPeriod('2028-02-20', { ...emptyTerms(), cycle: 'monthly' }).end,
  ).toBe('2028-02-29');
});
it('a prazo exige prazo explícito e 14 dias exige base', () => {
  expect(
    termsSchema.safeParse({ ...emptyTerms(), mode: 'credit' }).success,
  ).toBe(false);
  expect(
    termsSchema.safeParse({
      ...emptyTerms(),
      mode: 'credit',
      cycle: 'fourteen_days',
      due_days: 5,
    }).success,
  ).toBe(false);
});
it('CRC16 CCITT-FALSE usa vetor conhecido e BR Code só existe com chave', () => {
  expect(crc16('123456789')).toBe('29B1');
  expect(
    pixCode({ type: 'none', key: '', receiver: '', city: '' }, 100),
  ).toBeNull();
  const code = pixCode(
    {
      type: 'email',
      key: 'pix@example.test',
      receiver: 'DEMONSTRACAO',
      city: 'CIDADE TESTE',
    },
    1234,
  )!;
  expect(code).toContain('br.gov.bcb.pix');
  expect(code).toContain('540512.34');
  expect(code.slice(-4)).toBe(crc16(code.slice(0, -4)));
  expect(
    pixSchema.safeParse({
      type: 'phone',
      key: '123',
      receiver: 'TESTE',
      city: 'TESTE',
    }).success,
  ).toBe(false);
});

it('CRC16 confere exemplo estático oficial BACEN seção 2.6.3', () => {
  // Manual de Padrões para Iniciação do Pix, payload público ilustrativo.
  const payload =
    '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304';
  expect(crc16(payload)).toBe('1D3D');
});

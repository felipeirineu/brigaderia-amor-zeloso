import { expect, it } from 'vitest';
import { feedbackForm, feedbackPage, makeErrorCode } from './feedback';

it('retém só a categoria da rota e gera código curto pela data local', () => {
  expect(feedbackPage('/gestao/pedidos/id-demo?cliente=demo#nota')).toBe(
    'pedidos',
  );
  expect(feedbackPage('/gestao/identificador-privado')).toBe('gestao');
  expect(feedbackPage('/gestao?debug=demo')).toBe('hoje');
  expect(makeErrorCode(new Date('2030-01-08T01:00:00Z'), '1ab2-demo')).toBe(
    'E-0701-1AB2',
  );
});

it('aceita contexto opcional e recusa texto vazio, excesso, campos livres e identificadores', () => {
  const valid = { kind: 'problem', message: '  DEMONSTRAÇÃO  ' };
  expect(feedbackForm.parse(valid)).toEqual({
    kind: 'problem',
    message: 'DEMONSTRAÇÃO',
  });
  const context = {
    version: '1.1.0',
    system: 'iPhone',
    page: 'pedidos',
    error_code: 'E-2011-7F3A',
  };
  expect(feedbackForm.safeParse({ ...valid, context }).success).toBe(true);
  for (const data of [
    { ...valid, message: '  ' },
    { ...valid, message: 'x'.repeat(2001) },
    { ...valid, context: { ...context, page: '/gestao/pedidos/demo' } },
    { ...valid, context: { ...context, stack: 'DEMONSTRAÇÃO' } },
    { ...valid, context: { ...context, error_code: 'texto longo' } },
  ])
    expect(feedbackForm.safeParse(data).success).toBe(false);
});

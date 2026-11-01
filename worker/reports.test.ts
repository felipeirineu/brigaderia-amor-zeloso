import { expect, it } from 'vitest';
import { csvCell, toCSV } from './reports';
it('CSV impede fórmula mesmo com espaços/tabs e preserva delimitadores/aspas/newlines', () => {
  for (const text of [
    '=DEMONSTRAÇÃO',
    ' +DEMONSTRAÇÃO',
    '\t@DEMONSTRAÇÃO',
    '-DEMONSTRAÇÃO',
    '\n=DEMONSTRAÇÃO',
  ])
    expect(csvCell(text)).toMatch(/^"'/);
  expect(csvCell('DEMO; "teste"\nlinha')).toBe('"DEMO; ""teste""\nlinha"');
  expect(csvCell(-123)).toBe('"-123"');
  expect(toCSV(['DEMO'], [['valor']])).toContain('\uFEFF"DEMO"\r\n');
});

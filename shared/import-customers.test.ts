import { it, expect } from 'vitest';
import { parseCSV, customerRows } from './import-customers';
it('CSV trata aspas, vírgula, linhas internas, BOM e delimitador brasileiro', () => {
  const rows = customerRows(
    parseCSV(
      '\uFEFFnome;telefone;notas\r\n"Cliente DEMONSTRAÇÃO; teste";11900000001;"Duas\nlinhas e ""aspas"""',
    ),
  );
  expect(rows[0].name).toBe('Cliente DEMONSTRAÇÃO; teste');
  expect(rows[0].notes).toBe('Duas\nlinhas e "aspas"');
  expect(() => parseCSV('nome,telefone\n"sem fechar,1')).toThrow();
  expect(() =>
    customerRows([
      ['nome', 'email'],
      ['DEMONSTRAÇÃO', 'a@example.test'],
    ]),
  ).toThrow();
});
it('não aceita colunas ambíguas nem além do limite', () => {
  expect(() =>
    customerRows([
      ['nome', 'telefone', 'telefone'],
      ['DEMONSTRAÇÃO', '1', '2'],
    ]),
  ).toThrow();
  expect(() =>
    customerRows([
      ['nome', 'telefone'],
      ...Array.from({ length: 51 }, () => ['DEMONSTRAÇÃO', '11900000001']),
    ]),
  ).toThrow();
  expect(() =>
    customerRows([
      ['nome', 'telefone'],
      ['DEMONSTRAÇÃO', 1.2],
    ]),
  ).toThrow();
});

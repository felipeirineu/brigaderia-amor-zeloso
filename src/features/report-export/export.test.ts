import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import readXlsxFile from 'read-excel-file/node';
import { extractText } from 'unpdf';
import { strFromU8, unzipSync } from 'fflate';
import {
  countColumn,
  dateColumn,
  label,
  moneyColumn,
  type ExportTable,
} from '../../../shared/report-export';
import { createSpreadsheet } from './report-spreadsheet';
import { createReportPdf } from './report-pdf';
import { exportResponse } from '../../../worker/report-export';

const table: ExportTable = {
  columns: [
    label('Cliente'),
    dateColumn('Entrega'),
    countColumn('Pedidos', true),
    moneyColumn('Vendas'),
  ],
  rows: [
    ['=DEMONSTRAÇÃO', '2026-11-01', 2, 1250],
    ['Cliente DEMONSTRAÇÃO', '2026-11-02', 1, -100],
  ],
};

test('XLSX preserva texto literal, datas civis, valores numéricos e fórmulas de total', async () => {
  const blob = await createSpreadsheet(table, 'Vendas por cliente');
  const bytes = await blob.arrayBuffer();
  const [sheet] = await readXlsxFile(Buffer.from(bytes));
  expect(sheet.sheet).toBe('Vendas por cliente');
  expect(sheet.data).toEqual([
    ['Cliente', 'Entrega', 'Pedidos', 'Vendas'],
    ['=DEMONSTRAÇÃO', new Date('2026-11-01T00:00:00Z'), 2, 12.5],
    ['Cliente DEMONSTRAÇÃO', new Date('2026-11-02T00:00:00Z'), 1, -1],
    ['Total', null, 3, 11.5],
  ]);
  const zip = unzipSync(new Uint8Array(bytes));
  const xml = strFromU8(zip['xl/worksheets/sheet1.xml']);
  const styles = strFromU8(zip['xl/styles.xml']);
  expect(styles).toContain('<b/><color rgb="FFF9ECD7"/>');
  expect(styles).toContain('<fgColor rgb="FF321D10"/>');
  expect(xml.match(/<f>/g)).toHaveLength(2);
  expect(xml).toContain('<f>SUM(C2:C3)</f><v>3</v>');
  expect(xml).toContain('<f>SUM(D2:D3)</f><v>11.5</v>');
});

test('CSV mantém a proteção de texto e converte valores positivos e negativos em reais', async () => {
  const response = exportResponse(
    new Request('https://example.test/report'),
    table,
    'demo.csv',
  );
  const csv = await response.text();
  expect(csv).toContain('"Vendas"');
  expect(csv).toContain('"\'=DEMONSTRAÇÃO";"2026-11-01";"2";"12,50"');
  expect(csv).toContain('"-1,00"');
});

test('PDF repete cabeçalho, preserva acentos e inclui resumo, filtros, total e paginação', async () => {
  const asset = async (file: string) =>
    Uint8Array.from(
      await readFile(new URL('./assets/' + file, import.meta.url)),
    ).buffer;
  const [regular, bold, serif, logo] = await Promise.all(
    [
      'figtree.ttf',
      'figtree-bold.ttf',
      'dm-serif-display.ttf',
      'report-logo.png',
    ].map(asset),
  );
  const titles = {
    title: 'Vendas por cliente',
    period: 'Período: 01/11/2026 a 30/11/2026',
    filters: 'Cliente DEMONSTRAÇÃO',
  };
  const blob = await createReportPdf(
    {
      ...table,
      rows: Array.from({ length: 55 }, () => table.rows[0]),
    },
    titles,
    { regular, bold, serif, logo },
    new Date(2026, 10, 18, 10, 15),
  );
  const { totalPages, text } = await extractText(
    new Uint8Array(await blob.arrayBuffer()),
  );
  expect(totalPages).toBe(2);
  expect(text[0]).toMatch(
    /Período: 01\/11\/2026 a 30\/11\/2026.*Cliente DEMONSTRAÇÃO/,
  );
  expect(text[0]).toContain('Gerado em 18/11/2026 10:15 · página 1 de 2');
  expect(text[1]).toMatch(/Cliente\s+Entrega\s+Pedidos\s+Vendas/);
  expect(text[1]).toMatch(/Total\s+110\s+R\$\s*687,50/);
  expect(text[1]).toContain('Brigaderia Amor Zeloso · Gestão');
  expect(text[1]).toContain('página 2 de 2');
});

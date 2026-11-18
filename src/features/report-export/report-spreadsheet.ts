import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import writeXlsxFile, { type Cell, type Row } from 'write-excel-file/browser';
import type { ExportTable } from '../../../shared/report-export';
import {
  brDate,
  chocolate,
  cream,
  currency,
  displayCell,
  totals,
} from './table';

const mime =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function createSpreadsheet(table: ExportTable, title: string) {
  const widths = table.columns.map((column) =>
    Math.max(12, column.label.length + 2),
  );
  const header: Row = table.columns.map((column) => ({
    value: column.label,
    type: String,
    fontWeight: 'bold',
    textColor: cream,
    backgroundColor: chocolate,
    wrap: true,
  }));
  const rows = table.rows.map((row) =>
    row.map((cell, index): Cell => {
      const column = table.columns[index];
      widths[index] = Math.max(
        widths[index],
        displayCell(cell, column).length + 2,
      );
      if (cell === null) return null;
      if (typeof cell === 'number')
        return {
          value: column.type === 'money' ? cell / 100 : cell,
          type: Number,
          format: column.type === 'money' ? currency : undefined,
        };
      if (column.type === 'date')
        return {
          value: new Date(cell + 'T00:00:00Z'),
          type: Date,
          format: brDate,
        };
      return { value: cell, type: String, wrap: true };
    }),
  );

  const cache = new Map<string, number>();
  const total = totals(table).map((value, index): Cell => {
    const style = { backgroundColor: cream, fontWeight: 'bold' as const };
    if (index === 0) return { ...style, value: 'Total', type: String };
    if (value === null) return style;
    const isMoney = table.columns[index].type === 'money';
    const format = isMoney ? currency : undefined;
    const normalized = isMoney ? value / 100 : value;
    widths[index] = Math.max(
      widths[index],
      displayCell(value, table.columns[index]).length + 2,
    );
    if (!rows.length) return { ...style, value: 0, type: Number, format };
    const letter = String.fromCharCode(65 + index);
    const formula = `SUM(${letter}2:${letter}${rows.length + 1})`;
    cache.set(formula, normalized);
    return { ...style, value: formula, type: 'Formula', format };
  });
  const blob = await writeXlsxFile([header, ...rows, total], {
    sheet: [...title.replace(/[\\/*?:[\]]/g, ' ')].slice(0, 31).join(''),
    columns: widths.map((width) => ({ width: Math.min(55, width) })),
    stickyRowsCount: 1,
  }).toBlob();
  if (!cache.size) return blob;

  // O gerador escreve a fórmula. Gravamos também o valor inicial para leitores sem recálculo.
  const zip = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const sheet = 'xl/worksheets/sheet1.xml';
  zip[sheet] = strToU8(
    strFromU8(zip[sheet]).replace(
      /<f>(SUM\([A-Z]2:[A-Z]\d+\))<\/f>/g,
      (cell, formula: string) =>
        cache.has(formula) ? cell + '<v>' + cache.get(formula) + '</v>' : cell,
    ),
  );
  return new Blob([zipSync(zip)], { type: mime });
}

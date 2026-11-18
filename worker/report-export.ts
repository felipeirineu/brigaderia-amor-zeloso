import type { ExportCell, ExportTable } from '../shared/report-export';
import { fileResponse } from './p1-common';
import { json } from './security';

function quote(text: string) {
  return '"' + text.replaceAll('"', '""') + '"';
}

/** Somente os números já tipados escapam da proteção contra fórmulas. */
export function csvCell(value: ExportCell, money = false) {
  if (typeof value === 'number') {
    const numeric = money ? (value / 100).toFixed(2) : String(value);
    return quote(numeric.replace('.', ','));
  }
  let text = String(value ?? '').replace(/\0/g, '');
  if (
    typeof value === 'string' &&
    (/^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))
  )
    text = "'" + text;
  return quote(text);
}

export function toCSV(table: ExportTable) {
  const header = table.columns.map((column) => csvCell(column.label)).join(';');
  const rows = table.rows.map((row) =>
    row
      .map((cell, index) =>
        csvCell(cell, table.columns[index]?.type === 'money'),
      )
      .join(';'),
  );
  return '\uFEFF' + [header, ...rows].join('\r\n') + '\r\n';
}

export function exportResponse(
  req: Request,
  table: ExportTable,
  filename: string,
) {
  if (new URL(req.url).searchParams.get('format') === 'json')
    return json(table);
  return fileResponse(toCSV(table), 'text/csv; charset=utf-8', filename);
}

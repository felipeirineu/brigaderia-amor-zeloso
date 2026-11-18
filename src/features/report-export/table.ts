import type {
  ExportCell,
  ExportColumn,
  ExportTable,
} from '../../../shared/report-export';

export const chocolate = '#321D10';
export const cream = '#F9ECD7';
export const currency = '"R$" #,##0.00';
export const brDate = 'dd/mm/yyyy';
const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 });

export function displayCell(value: ExportCell, column: ExportColumn) {
  if (value === null) return '';
  if (typeof value === 'number')
    return column.type === 'money'
      ? money.format(value / 100)
      : number.format(value);
  return column.type === 'date' ? value.split('-').reverse().join('/') : value;
}

export function totals(table: ExportTable) {
  return table.columns.map((column, index) =>
    column.sum
      ? table.rows.reduce((total, row) => total + Number(row[index] ?? 0), 0)
      : null,
  );
}

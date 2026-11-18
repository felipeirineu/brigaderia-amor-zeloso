export type ExportCell = string | number | null;
export type ExportColumn = {
  label: string;
  type?: 'money' | 'date' | 'number';
  sum?: boolean;
};

export type ExportTable = {
  columns: ExportColumn[];
  rows: ExportCell[][];
  summary?: { label: string; value: number; type?: 'money' }[];
};

export const label = (label: string): ExportColumn => ({ label });
export const dateColumn = (label: string): ExportColumn => ({
  label,
  type: 'date',
});
export const countColumn = (label: string, sum = false): ExportColumn => ({
  label,
  type: 'number',
  sum,
});
export const moneyColumn = (label: string): ExportColumn => ({
  label,
  type: 'money',
  sum: true,
});

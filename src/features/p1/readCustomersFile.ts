import { Unzip, UnzipInflate, strFromU8 } from 'fflate';
import { customerRows, parseCSV } from '../../../shared/import-customers';
/** Limita a expansão real antes de delegar a leitura XLSX; rejeita fórmulas e macros. */
export function inspectSpreadsheet(bytes: Uint8Array) {
  const entries: Record<string, Uint8Array[]> = {};
  const finished = new Set<string>();
  let expanded = 0,
    count = 0;
  const zip = new Unzip((file) => {
    if (++count > 100 || /\.\.|vbaProject|externalLinks/i.test(file.name))
      throw Error('Planilha com estrutura não permitida.');
    let size = 0;
    const parts: Uint8Array[] = [];
    entries[file.name] = parts;
    file.ondata = (error, data, final) => {
      if (error) throw error;
      size += data.length;
      expanded += data.length;
      if (size > 2 * 1024 * 1024 || expanded > 4 * 1024 * 1024)
        throw Error('Planilha expandida muito grande.');
      parts.push(data);
      if (final) finished.add(file.name);
    };
    file.start();
  });
  zip.register(UnzipInflate);
  for (let i = 0; i < bytes.length; i += 8192)
    zip.push(bytes.subarray(i, i + 8192), i + 8192 >= bytes.length);
  if (finished.size !== Object.keys(entries).length)
    throw Error('Arquivo XLSX incompleto.');
  if (!entries['xl/workbook.xml'])
    throw Error('Escolha um arquivo XLSX válido.');
  for (const [name, parts] of Object.entries(entries))
    if (name.endsWith('.xml')) {
      const merged = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
      let offset = 0;
      for (const p of parts) {
        merged.set(p, offset);
        offset += p.length;
      }
      const text = strFromU8(merged);
      if (/<!DOCTYPE|<!ENTITY/i.test(text))
        throw Error('XML externo não permitido.');
      if (name.startsWith('xl/worksheets/')) {
        const doc = new DOMParser().parseFromString(text, 'application/xml');
        if (
          doc.getElementsByTagName('parsererror').length ||
          doc.getElementsByTagNameNS('*', 'f').length
        )
          throw Error(
            'Remova fórmulas da planilha: cole os valores como texto.',
          );
        const cells = [...doc.getElementsByTagNameNS('*', 'c')];
        if (cells.length > 1100) throw Error('Planilha excede o limite.');
        for (const cell of cells) {
          const r = cell.getAttribute('r') ?? '',
            m = /^([A-Z]{1,2})(\d+)$/.exec(r);
          if (!m || m[1].length > 1 || m[1] > 'T' || Number(m[2]) > 51)
            throw Error('Use até 50 linhas de clientes e 20 colunas.');
        }
        for (const dim of doc.getElementsByTagNameNS('*', 'dimension')) {
          const end = dim.getAttribute('ref')?.split(':').pop() ?? '';
          if (!/^[A-T](?:[1-9]|[1-4]\d|5[01])$/.test(end))
            throw Error('Dimensões da planilha excedem o limite.');
        }
      }
    }
}
export async function readCustomersFile(file: File) {
  if (file.size > 1024 * 1024)
    throw Error('Arquivo maior que 1 MB. Divida a planilha.');
  if (/\.csv$/i.test(file.name))
    return customerRows(parseCSV(await file.text()));
  if (!/\.xlsx$/i.test(file.name))
    throw Error('Use CSV UTF-8 ou XLSX, sem macros/fórmulas.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  inspectSpreadsheet(bytes);
  const { readSheet } = await import('read-excel-file/browser');
  return customerRows(await readSheet(file, 1, { parseNumber: (s) => s }));
}

export const MAX_IMPORT_ROWS = 50;
/** RFC 4180, incluindo aspas escapadas e quebras dentro do campo. Não executa fórmulas. */
export function parseCSV(raw: string): string[][] {
  const text = raw.replace(/^\uFEFF/, ''),
    header = text.split(/\r?\n/, 1)[0],
    delimiter =
      (header.match(/;/g)?.length ?? 0) > (header.match(/,/g)?.length ?? 0)
        ? ';'
        : ',';
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === '"') {
      if (cell || closed) throw Error('Aspas inválidas no CSV.');
      quoted = true;
    } else if (c === delimiter) {
      row.push(cell);
      cell = '';
      closed = false;
    } else if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = '';
      closed = false;
      if (rows.length > MAX_IMPORT_ROWS + 1)
        throw Error('Divida em arquivos de até 50 clientes.');
    } else {
      if (closed && !/\s/.test(c)) throw Error('Texto após aspas no CSV.');
      if (!closed) cell += c;
    }
  }
  if (quoted) throw Error('Aspas não fechadas no CSV.');
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export function customerRows(cells: unknown[][]) {
  if (cells.length < 2 || cells.length > MAX_IMPORT_ROWS + 1)
    throw Error('Informe cabeçalho e de 1 a 50 clientes.');
  const normalize = (s: unknown) =>
      String(s ?? '')
        .trim()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase(),
    headers = cells[0].map(normalize),
    keys: Record<string, string> = {
      nome: 'name',
      telefone: 'phone',
      email: 'email',
      notas: 'notes',
    };
  if (
    headers.some((h) => !keys[h]) ||
    new Set(headers).size !== headers.length ||
    !headers.includes('nome') ||
    !headers.includes('telefone')
  )
    throw Error(
      'Use cabeçalhos nome, telefone e, opcionalmente, email e notas.',
    );
  return cells
    .slice(1)
    .filter((row) =>
      row.some((v) => v !== null && v !== undefined && String(v).trim()),
    )
    .map((row) => {
      if (
        row.length > headers.length &&
        row.slice(headers.length).some(Boolean)
      )
        throw Error('Linha com colunas excedentes.');
      const out: Record<string, string> = {
        name: '',
        phone: '',
        email: '',
        notes: '',
      };
      headers.forEach((h, i) => {
        const v = row[i];
        if (
          v instanceof Date ||
          typeof v === 'boolean' ||
          (typeof v === 'number' && !Number.isSafeInteger(v))
        )
          throw Error('Use texto no telefone e nos demais campos.');
        out[keys[h]] = String(v ?? '').trim();
      });
      return out;
    });
}

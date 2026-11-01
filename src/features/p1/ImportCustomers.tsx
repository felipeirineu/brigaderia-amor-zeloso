import { Button } from '../../components/Button';
import { useRef, useState } from 'react';
import { api } from '../api';
import { Failure } from '../operations/common';
import { readCustomersFile } from './readCustomersFile';
interface Row {
  index: number;
  status: string;
  message: string;
  data: { name: string; phone: string; email: string; notes: string } | null;
}
export function ImportCustomers() {
  const [raw, setRaw] = useState<Record<string, string>[]>([]),
    [preview, setPreview] = useState<Row[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    pending = useRef(false),
    request = useRef({ body: '', key: crypto.randomUUID() });
  async function file(f?: File) {
    if (!f) return;
    setBusy(true);
    setError('');
    setNotice('');
    setPreview([]);
    setSelected([]);
    try {
      setRaw(await readCustomersFile(f));
    } catch (e) {
      setRaw([]);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function show() {
    setBusy(true);
    setError('');
    try {
      const r = await api<{ rows: Row[] }>(
        'p1/customer-import/preview',
        'POST',
        { rows: raw },
      );
      setPreview(r.rows);
      setSelected(
        r.rows.filter((r) => r.status === 'ready').map((r) => r.index),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const data = { rows: raw, selected },
        body = JSON.stringify(data);
      if (request.current.body !== body)
        request.current = { body, key: crypto.randomUUID() };
      const r = await api<{ rows: { status: string }[] }>(
        'p1/customer-import/confirm',
        'POST',
        data,
        request.current.key,
      );
      setNotice(
        `${r.rows.filter((r) => r.status === 'created').length} clientes importados; ${r.rows.filter((r) => r.status === 'existing').length} já existentes foram ignorados.`,
      );
      setPreview([]);
      setSelected([]);
      setRaw([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h1>Importar clientes</h1>
      <p>
        Somente contatos autorizados. CSV UTF-8 ou XLSX, até 50 clientes e 1 MB.
        Cabeçalho: nome, telefone, email e notas (os dois últimos opcionais).
        Telefone com DDD, preferencialmente texto na planilha. Não use
        fórmulas/macros. XLSX usa a primeira aba.
      </p>
      <p>
        O arquivo original fica neste navegador, em memória. Ver prévia envia
        apenas as linhas para validação; nada é gravado até confirmar. Telefones
        existentes, inclusive arquivados, não são sobrescritos. Divida arquivos
        maiores.
      </p>
      <label>
        Arquivo de clientes
        <input
          type="file"
          accept=".csv,.xlsx"
          disabled={busy}
          onChange={(e) => void file(e.target.files?.[0])}
        />
      </label>
      <Failure message={error} />
      <p role="status">{notice}</p>
      {raw.length > 0 && (
        <Button disabled={busy} onClick={() => void show()} loading={busy}>
          Ver prévia de {raw.length} clientes
        </Button>
      )}
      {preview.length > 0 && (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Importar</th>
                  <th>Linha</th>
                  <th>Nome</th>
                  <th>Telefone normalizado</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.index}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Importar linha ${r.index + 2}`}
                        disabled={busy || r.status !== 'ready'}
                        checked={selected.includes(r.index)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, r.index]
                              : selected.filter((i) => i !== r.index),
                          )
                        }
                      />
                    </td>
                    <td>{r.index + 2}</td>
                    <td>{r.data?.name ?? 'Dados inválidos'}</td>
                    <td>{r.data?.phone ?? ''}</td>
                    <td>{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            className="primary-action"
            disabled={busy || !selected.length}
            onClick={() => void confirm()}
            variant="primary"
            loading={busy}
          >
            Confirmar importação de {selected.length} clientes
          </Button>
        </>
      )}
    </section>
  );
}

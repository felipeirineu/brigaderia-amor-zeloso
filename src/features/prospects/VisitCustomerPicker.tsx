import { useField } from '../field/FieldContext';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { SkeletonList } from '../../components/Skeleton';
import { api } from '../api';
import { useRemote, Failure } from '../operations/common';
import { PlaceFields } from '../field/PlaceFields';
import { emptyPlace } from '../../../shared/field';
type Recipient = { id: string; name: string; kind: 'customer' | 'prospect' };
function Selected({ id }: { id: string }) {
  const view = useRemote<Recipient>('customers/' + id);
  return (
    <section aria-label="Destinatário da visita">
      <Failure message={view.error} />
      {view.data && (
        <>
          <p>
            Para quem: <strong>{view.data.name}</strong> ·{' '}
            {view.data.kind === 'prospect' ? 'Contato' : 'Cliente'}
          </p>
          <p>
            Objetivo:{' '}
            <strong>
              {view.data.kind === 'prospect'
                ? 'Apresentação'
                : 'Novos sabores/opções'}
            </strong>
          </p>
        </>
      )}
    </section>
  );
}
export function VisitCustomerPicker({
  value,
  onChange,
  onBusy,
}: {
  value: string;
  onChange: (id: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const field = useField();
  const [q, setQ] = useState(''),
    [search, setSearch] = useState(''),
    [creating, setCreating] = useState(false),
    [name, setName] = useState(''),
    [phone, setPhone] = useState(''),
    [place, setPlace] = useState(emptyPlace),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const pending = useRef(false),
    request = useRef({ body: '', key: crypto.randomUUID() });
  useEffect(() => {
    const timer = setTimeout(() => setSearch(q), 300);
    return () => clearTimeout(timer);
  }, [q]);
  const list = useRemote<Recipient[]>(
    'customers?kind=all&q=' + encodeURIComponent(search),
  );
  async function create() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    onBusy(true);
    setError('');
    try {
      if (!name.trim()) throw Error('Informe o nome do contato.');
      const data = {
          name,
          phone,
          prospect: {},
          site: { version: 0, data: place },
        },
        body = JSON.stringify(data);
      if (request.current.body !== body)
        request.current = { body, key: crypto.randomUUID() };
      const saved = await api<{ id: string }>(
        'prospects',
        'POST',
        data,
        request.current.key,
      );
      onChange(saved.id);
      void field?.refresh();
      setCreating(false);
      setName('');
      setPhone('');
      setPlace(emptyPlace());
      setQ('');
      void list.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <>
      <label>
        Buscar contato ou cliente
        <input
          type="search"
          value={q}
          maxLength={120}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nome ou telefone"
        />
      </label>
      <Failure message={list.error || error} />
      {value && <Selected key={value} id={value} />}
      <Button
        type="button"
        onClick={() => {
          if (!creating) onChange('');
          setCreating(!creating);
          setError('');
        }}
      >
        {' '}
        {creating ? 'Cancelar novo contato' : 'Novo contato'}
      </Button>
      {creating ? (
        <fieldset className="customer-form-fields">
          <legend>Novo contato</legend>
          <p>
            Este cadastro será salvo ao tocar em Salvar contato; a visita só
            será agendada depois.
          </p>
          <label>
            Nome do contato
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Telefone do contato (opcional)
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <PlaceFields value={place} onChange={setPlace} />
          <Button
            type="button"
            disabled={busy || !name.trim()}
            loading={busy}
            onClick={() => void create()}
          >
            Salvar contato
          </Button>
        </fieldset>
      ) : !value || q.trim() ? (
        <>
          {!list.data && !list.error && (
            <SkeletonList count={1} label="Buscando contatos e clientes…" />
          )}
          <div
            className="customer-tiles"
            role="group"
            aria-label="Contatos e clientes"
          >
            {list.data?.slice(0, 12).map((c) => (
              <Button
                key={c.id}
                type="button"
                variant="card"
                aria-label={'Selecionar ' + c.name}
                aria-pressed={value === c.id}
                onClick={() => {
                  onChange(c.id);
                  setQ('');
                }}
              >
                <strong>{c.name}</strong>
                <span>{c.kind === 'prospect' ? 'Contato' : 'Cliente'}</span>
              </Button>
            ))}
          </div>
          {list.data?.length === 0 && (
            <p>Nenhum contato ou cliente encontrado.</p>
          )}
          {!!list.data && list.data.length > 12 && (
            <p>
              Digite mais do nome ou telefone para encontrar outros cadastros.
            </p>
          )}
        </>
      ) : null}
    </>
  );
}

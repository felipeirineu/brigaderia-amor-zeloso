import { Button } from '../../components/Button';
import { useState } from 'react';

import { useField } from './FieldContext';
import { api } from '../api';
import { Failure } from '../operations/common';
export function ProfileSettings() {
  const ctx = useField(),
    [name, setName] = useState<string | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  if (!ctx?.data) return null;
  const own = ctx.data.staff.find((s) => s.id === ctx.data!.user_id);
  return (
    <section className="panel">
      <h2>Seu nome de exibição</h2>
      <p>Este nome aparece para a equipe nos entregadores.</p>
      <Failure message={error} />
      <p role="status">{notice}</p>
      <label>
        Nome de exibição
        <input
          value={name ?? own?.display_name ?? ''}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />
      </label>
      <Button
        disabled={busy || !name?.trim()}
        onClick={() => {
          setBusy(true);
          setError('');
          void api(
            'field/profile',
            'PUT',
            { display_name: name, version: own?.version ?? 0 },
            crypto.randomUUID(),
          )
            .then(() => ctx.refresh())
            .then(() => {
              setName(null);
              setNotice('Nome atualizado.');
            })
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
        variant="primary"
        loading={busy}
      >
        Salvar nome de exibição
      </Button>
      {ctx.data.role === 'owner' && (
        <Button className="button" to="/gestao/empresa" variant="ghost">
          Configurar endereço da empresa
        </Button>
      )}
    </section>
  );
}

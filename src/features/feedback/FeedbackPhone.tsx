import { useState } from 'react';
import { Button } from '../../components/Button';
import { api } from '../api';
import { Failure, useRemote } from '../operations/common';

export function FeedbackPhone() {
  const view = useRemote<{ phone: string }>('feedback/phone');
  const [draft, setDraft] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const phone = draft ?? view.data?.phone ?? '';

  async function save() {
    if (busy) return;
    setBusy(true);
    setNotice('');
    setError('');
    try {
      if (!/^[+()0-9 .-]*$/.test(phone))
        throw new Error('Informe o telefone com DDD ou deixe o campo vazio.');
      const digits = phone.replace(/\D/g, '');
      // Formato nacional com DDD ou internacional com DDI.
      const normalized =
        digits.length === 10 || digits.length === 11 ? '55' + digits : digits;
      await api('feedback/phone', 'PUT', { phone: normalized });
      await view.refresh();
      setDraft(null);
      setNotice(normalized ? 'Telefone salvo.' : 'Telefone removido.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="panel data-form"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <h2>Retorno sobre sugestões</h2>
      <p>
        O administrador pode usar este número para responder no WhatsApp. O
        preenchimento é opcional.
      </p>
      <label>
        Telefone para retorno (com DDD)
        <input
          type="tel"
          autoComplete="tel"
          value={phone}
          maxLength={30}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <Button type="submit" loading={busy} disabled={draft === null}>
        Salvar telefone
      </Button>
      <p role="status">{notice}</p>
      <Failure message={error || view.error} />
    </form>
  );
}

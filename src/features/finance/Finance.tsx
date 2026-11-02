import { Button } from '../../components/Button';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, money, civilDate } from '../api';
import { useRemote, Failure } from '../operations/common';
export interface Summary {
  day: string;
  received_cents: number;
  receivable_cents: number;
  overdue_cents: number;
  week_cents: number;
  customers: {
    id: string;
    name: string;
    balance_cents: number;
    overdue_days: number;
    unconfigured: number;
    received_cents: number;
    overdue_cents: number;
    week_cents: number;
  }[];
}
export function FinanceSummary({ compact = false }: { compact?: boolean }) {
  const [search] = useSearchParams(),
    filter = compact ? '' : search.get('filter') || '';
  const view = useRemote<Summary>(
    'finance/summary' + (filter ? '?filter=' + encodeURIComponent(filter) : ''),
  );
  return (
    <section className="panel">
      <h2>{compact ? 'Recebimentos e a receber' : 'Resumo financeiro'}</h2>
      <Failure message={view.error} />
      {view.data && (
        <>
          <div className="summary-grid">
            <Button
              className="panel"
              to="/gestao/financeiro?filter=received"
              variant="ghost"
            >
              Recebido hoje: {money(view.data.received_cents)}
            </Button>
            <Button
              className="panel"
              to="/gestao/financeiro?filter=overdue"
              variant="ghost"
            >
              A receber vencido: {money(view.data.overdue_cents)}
            </Button>
            <Button
              className="panel"
              to="/gestao/financeiro?filter=week"
              variant="ghost"
            >
              Vence esta semana: {money(view.data.week_cents)}
              <small> Hoje a domingo</small>
            </Button>
          </div>
          <p>
            Recebido líquido em {civilDate(view.data.day)}:{' '}
            <strong>{money(view.data.received_cents)}</strong>
          </p>
          <p>
            A receber de entregas:{' '}
            <strong>{money(view.data.receivable_cents)}</strong>
          </p>
          {view.data.customers.map((c) => (
            <article key={c.id}>
              <Button to={`/gestao/financeiro/${c.id}`} variant="ghost">
                {c.name}:{' '}
                {money(
                  filter === 'received'
                    ? c.received_cents
                    : filter === 'overdue'
                      ? c.overdue_cents
                      : filter === 'week'
                        ? c.week_cents
                        : c.balance_cents,
                )}
              </Button>
              {c.overdue_days > 0 && (
                <p role="alert">
                  Saldo vencido há {c.overdue_days} dias. Sem bloqueio de
                  pedido.
                </p>
              )}
              {c.unconfigured > 0 && (
                <p>Há entregas sem condição definida; confira a conta.</p>
              )}
            </article>
          ))}
          <p>
            Rascunhos e valores ainda não entregues ficam separados de contas a
            receber.
          </p>
        </>
      )}
    </section>
  );
}
export function Finance({ role }: { role: string }) {
  const customers = useRemote<{ id: string; name: string }[]>(
    'customers?active=all',
  );
  return (
    <>
      <h1 className="mobile-context-title">Financeiro</h1>
      <Button to="/gestao/financeiro" variant="ghost">
        Todas as contas
      </Button>
      <FinanceSummary />
      {role === 'owner' && (
        <Button className="button" to="/gestao/financeiro/pix" variant="ghost">
          Configurar Pix
        </Button>
      )}
      <Failure message={customers.error} />
      <h2>Contas dos clientes</h2>
      {customers.data?.map((c) => (
        <p key={c.id}>
          <Button to={`/gestao/financeiro/${c.id}`} variant="ghost">
            {c.name}
          </Button>
        </p>
      ))}
    </>
  );
}
interface PixSettings {
  type: 'none' | 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  key: string;
  receiver: string;
  city: string;
}
export function PixSettings() {
  const view = useRemote<{ data: PixSettings; version: number }>(
      'finance/settings',
    ),
    [form, setForm] = useState<PixSettings | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const value = form ?? view.data?.data;
  return (
    <>
      <h1>Configuração Pix</h1>
      <Failure message={error || view.error} />
      <p role="status">{notice}</p>
      {value && (
        <form
          className="panel data-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              busy ||
              !confirm(
                'Salvar estes dados Pix para as próximas cobranças? Confira a chave e o recebedor.',
              )
            )
              return;
            setBusy(true);
            setError('');
            void api('finance/settings', 'PUT', {
              version: view.data!.version,
              data: value,
            })
              .then(async () => {
                await view.refresh();
                setForm(null);
                setNotice('Dados Pix salvos. Nenhum pagamento foi realizado.');
              })
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          <label>
            Tipo de chave
            <select
              value={value.type}
              onChange={(e) =>
                setForm({
                  ...value,
                  type: e.target.value as PixSettings['type'],
                  key: '',
                })
              }
            >
              <option value="none">Sem Pix cadastrado</option>
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="email">E-mail</option>
              <option value="phone">Telefone E.164</option>
              <option value="random">Aleatória</option>
            </select>
          </label>
          {value.type !== 'none' && (
            <>
              {(['key', 'receiver', 'city'] as const).map((field) => (
                <label key={field}>
                  {field === 'key'
                    ? 'Chave Pix'
                    : field === 'receiver'
                      ? 'Nome do recebedor'
                      : 'Cidade do recebedor'}
                  <input
                    required
                    maxLength={
                      field === 'key' ? 254 : field === 'receiver' ? 25 : 15
                    }
                    autoComplete="off"
                    value={value[field]}
                    onChange={(e) =>
                      setForm({ ...value, [field]: e.target.value })
                    }
                  />
                </label>
              ))}
            </>
          )}
          <Button disabled={busy} variant="primary" loading={busy}>
            Salvar configuração Pix
          </Button>
          <p>
            Dados privados, nunca publicados no catálogo. A cobrança não contém
            Pix enquanto a chave não for cadastrada. Confira o recebedor no
            banco antes de pagar.
          </p>
        </form>
      )}
    </>
  );
}

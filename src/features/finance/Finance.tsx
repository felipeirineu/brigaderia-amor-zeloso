import { useConfirm } from '../../components/confirm-context';
import {
  SkeletonList,
  SkeletonRegion,
  SkeletonStats,
} from '../../components/Skeleton';
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
    next_delivery_cents: number;
  }[];
}
export function FinanceSummary({
  compact = false,
  dashboard = false,
  tripsCents = null,
}: {
  compact?: boolean;
  dashboard?: boolean;
  tripsCents?: number | null;
}) {
  const [search] = useSearchParams(),
    filter = compact ? '' : search.get('filter') || '';
  const view = useRemote<Summary>(
    'finance/summary' + (filter ? '?filter=' + encodeURIComponent(filter) : ''),
  );
  return (
    <section className="panel finance-summary">
      {!dashboard && (
        <h2>{compact ? 'Recebimentos e a receber' : 'Resumo financeiro'}</h2>
      )}
      <Failure message={view.error} />
      {!view.data && !view.error && (
        <SkeletonRegion label="Carregando resumo financeiro…">
          <SkeletonStats />
        </SkeletonRegion>
      )}
      {view.data && (
        <>
          <div className="finance-kpis">
            {[
              [
                'Recebido hoje',
                view.data.received_cents,
                '/gestao/financeiro?filter=received',
                'Pix, dinheiro e cartão',
              ],
              [
                'A receber',
                view.data.receivable_cents,
                '/gestao/financeiro',
                'Entregas realizadas',
              ],
              [
                'Vencido',
                view.data.overdue_cents,
                '/gestao/financeiro?filter=overdue',
                'Saldos após o vencimento',
              ],
              [
                dashboard ? 'Corridas na semana' : 'Vence esta semana',
                dashboard ? tripsCents : view.data.week_cents,
                dashboard
                  ? '/gestao/deslocamentos'
                  : '/gestao/financeiro?filter=week',
                dashboard
                  ? 'Semana atual, líquido de estornos'
                  : 'Hoje a domingo',
              ],
            ].map(([label, value, to, note]) => (
              <Button
                key={String(label)}
                variant="card"
                className="finance-kpi"
                to={String(to)}
                disabled={value === null}
              >
                <span>{label}</span>
                <strong>
                  {value === null ? 'Indisponível' : money(Number(value))}
                </strong>
                <small>{note}</small>
              </Button>
            ))}
          </div>
          {!dashboard && (
            <>
              <div className="chips" aria-label="Filtro de recebíveis">
                <Button
                  to="/gestao/financeiro"
                  variant={filter ? 'tonal' : 'primary'}
                >
                  Todos
                </Button>
                <Button
                  to="/gestao/financeiro?filter=next_delivery"
                  variant={filter === 'next_delivery' ? 'primary' : 'tonal'}
                >
                  Na próxima entrega
                </Button>
              </div>
              <p className="finance-reference">
                Valores líquidos em {civilDate(view.data.day)}. Saldos de
                entregas realizadas.
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
                            : filter === 'next_delivery'
                              ? c.next_delivery_cents
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
                Rascunhos e valores ainda não entregues ficam separados de
                contas a receber.
              </p>
            </>
          )}
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
      {!customers.data && !customers.error && (
        <SkeletonList label="Carregando contas…" />
      )}
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
  const askConfirmation = useConfirm();

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
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              busy ||
              !(await askConfirmation(
                'Salvar estes dados Pix para as próximas cobranças? Confira a chave e o recebedor.',
                'Salvar dados Pix',
              ))
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
              <option value="phone">Telefone (celular)</option>
              <option value="random">Chave aleatória</option>
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
                  {field !== 'key' && (
                    <small>
                      {field === 'receiver'
                        ? 'Como aparece no banco, até 25 letras.'
                        : 'Até 15 letras, ex.: Joao Pessoa.'}
                    </small>
                  )}
                  <input
                    required
                    inputMode={
                      field !== 'key'
                        ? 'text'
                        : value.type === 'cpf' || value.type === 'cnpj'
                          ? 'numeric'
                          : value.type === 'phone'
                            ? 'tel'
                            : value.type === 'email'
                              ? 'email'
                              : 'text'
                    }
                    placeholder={
                      field !== 'key'
                        ? undefined
                        : {
                            none: undefined,
                            cpf: '000.000.000-00',
                            cnpj: '00.000.000/0000-00',
                            email: 'nome@exemplo.com',
                            phone: '(83) 99999-9999',
                            random: 'Cole a chave aleatória do banco',
                          }[value.type]
                    }
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

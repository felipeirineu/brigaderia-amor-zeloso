import { Button } from '../../components/Button';
import { useCourierLabels } from '../field/FieldContext';
import { MoneyField } from '../../components/NumericInputs';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, parsePrice } from '../api';
import { useRemote, Failure } from '../operations/common';
import { emptyProfile, type B2BProfile } from '../../../shared/finance';
import { TermsEditor } from './TermsEditor';
export function CustomerProfile() {
  const courierLabels = useCourierLabels();
  const { id } = useParams(),
    view = useRemote<{ data: B2BProfile; version: number }>(
      `finance/customers/${id}/profile`,
    );
  const [form, setForm] = useState<B2BProfile | null>(null),
    [fee, setFee] = useState('0,00'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const value = form ?? view.data?.data ?? emptyProfile();
  const change = (d: Partial<B2BProfile>) => {
    if (!form)
      setFee((value.courier_fee_cents / 100).toFixed(2).replace('.', ','));
    setForm({ ...value, ...d });
  };
  return (
    <>
      <Button to="/gestao/clientes" variant="ghost">
        Clientes
      </Button>
      <h1>Cadastro B2B e condições</h1>
      <Failure message={error || view.error} />
      <p role="status">{notice}</p>
      {view.data && (
        <>
          <Button
            onClick={() => {
              setForm(view.data!.data);
              setFee(
                (view.data!.data.courier_fee_cents / 100)
                  .toFixed(2)
                  .replace('.', ','),
              );
            }}
          >
            Editar dados B2B
          </Button>
          <form
            className="panel data-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setError('');
              void (async () => {
                try {
                  await api(`finance/customers/${id}/profile`, 'PUT', {
                    version: view.data!.version,
                    data: {
                      ...value,
                      courier_fee_cents: form
                        ? parsePrice(fee)
                        : value.courier_fee_cents,
                    },
                  });
                  await view.refresh();
                  setForm(null);
                  setNotice(
                    'Padrões salvos. Pedidos anteriores foram preservados.',
                  );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            {(
              [
                ['establishment', 'Estabelecimento'],
                ['responsible', 'Responsável'],
                ['address', 'Endereço padrão'],
                ['neighborhood', 'Bairro'],
                ['reference', 'Referência'],
                ['delivery_window', 'Janela de entrega'],
              ] as const
            ).map(([field, label]) => (
              <label key={field}>
                {label}
                <input
                  value={value[field]}
                  maxLength={
                    field === 'address'
                      ? 600
                      : field === 'reference'
                        ? 200
                        : field === 'delivery_window'
                          ? 100
                          : 120
                  }
                  onChange={(e) => change({ [field]: e.target.value })}
                />
              </label>
            ))}
            <fieldset>
              <legend>Dias habituais</legend>
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(
                (day, i) => (
                  <label key={day}>
                    <input
                      type="checkbox"
                      checked={value.delivery_days.includes(i + 1)}
                      onChange={(e) =>
                        change({
                          delivery_days: e.target.checked
                            ? [...value.delivery_days, i + 1]
                            : value.delivery_days.filter((v) => v !== i + 1),
                        })
                      }
                    />
                    {day}
                  </label>
                ),
              )}
            </fieldset>
            <label>
              Entregador padrão do cliente
              <select
                value={value.courier}
                onChange={(e) =>
                  change({ courier: e.target.value as B2BProfile['courier'] })
                }
              >
                <option value="unassigned">A definir</option>
                <option value="owner">{courierLabels.owner}</option>
                <option value="partner">{courierLabels.partner}</option>
                <option value="courier">Motoboy</option>
              </select>
            </label>
            {value.courier === 'courier' && (
              <label>
                Nome do motoboy
                <input
                  required
                  maxLength={100}
                  value={value.courier_name}
                  onChange={(e) => change({ courier_name: e.target.value })}
                />
              </label>
            )}
            <MoneyField
              label="Taxa padrão (R$)"
              value={
                form
                  ? fee
                  : (value.courier_fee_cents / 100).toFixed(2).replace('.', ',')
              }
              onValueChange={(value) => {
                change({});
                setFee(value);
              }}
            />
            <TermsEditor
              value={value.terms}
              onChange={(terms) => change({ terms })}
            />
            <Button disabled={busy} variant="primary" loading={busy}>
              Salvar padrões B2B
            </Button>
          </form>
          <Button
            className="button"
            to={`/gestao/financeiro/${id}`}
            variant="ghost"
          >
            Ver conta do cliente
          </Button>
        </>
      )}
    </>
  );
}

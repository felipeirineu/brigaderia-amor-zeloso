import { WhatsAppLink } from '../../components/TestEnvironment';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { DisclosureSummary } from '../../components/DisclosureSummary';
import { MoneyInput } from '../../components/NumericInputs';
import { SkeletonList } from '../../components/Skeleton';
import { api, money, civilDate } from '../api';
import { useRemote, Failure, localDay } from '../operations/common';
import { paymentMethods } from '../../../shared/finance';
import type { ProspectVisit } from '../../../shared/visits';
import type {
  VisitCosts,
  ProspectReport,
} from '../../../shared/prospect-costs';
const cost = (n: number | null) => (n === null ? 'Indisponível' : money(n));
export function FollowupSheet({
  visit,
  onClose,
}: {
  visit: ProspectVisit;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null);
  const [kind, setKind] = useState(visit.record ? 'thanks' : 'prices'),
    [message, setMessage] = useState(''),
    [notice, setNotice] = useState('');
  const view = useRemote<{
    message: string;
    phone: string;
    signature: string;
    has_name: boolean;
    contact_status: string;
  }>('visits/' + visit.id + '/followup?kind=' + kind);
  useEffect(() => {
    trigger.current = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => trigger.current?.focus();
  }, []);
  // Editar só mantém texto em memória; a prévia não registra contato ou envio.
  const text = message || view.data?.message || '';
  const [edited, setEdited] = useState(false);
  const shown = edited ? message : text;
  return (
    <dialog
      ref={dialog}
      className="help-sheet"
      aria-label={'WhatsApp de prospecção · ' + visit.customer_name}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="sheet-body">
        <h2>WhatsApp de prospecção</h2>
        <p>{visit.customer_name}</p>
        <div
          className="prospect-actions"
          role="group"
          aria-label="Modelo de prospecção"
        >
          {[
            ['thanks', 'Obrigada pela visita'],
            ['feedback', 'O que achou das amostras?'],
            ['prices', 'Tabela de preços'],
          ].map(([value, label]) => (
            <Button
              key={value}
              variant="chip"
              aria-pressed={kind === value}
              disabled={
                (value === 'thanks' && !visit.record) ||
                (value === 'feedback' && !visit.record?.samples.length)
              }
              onClick={() => {
                setKind(value);
                setMessage('');
                setEdited(false);
                setNotice('');
              }}
            >
              {label}
            </Button>
          ))}
        </div>
        <Failure message={view.error} />
        {!view.data && !view.error && (
          <SkeletonList label="Preparando prévia…" count={1} />
        )}
        {view.data && (
          <>
            {view.data.contact_status === 'not_interested' && (
              <p>Status do contato: Não teve interesse.</p>
            )}
            <label>
              Confira e edite a mensagem
              <textarea
                maxLength={8000}
                rows={7}
                value={shown}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setEdited(true);
                }}
              />
            </label>
            <p>
              O envio será feito por você no WhatsApp. Nenhuma campanha ou
              mensagem é enviada automaticamente.
            </p>
            {!view.data.has_name && (
              <p>
                Defina seu nome para assinar a mensagem.{' '}
                <Button
                  to="/gestao/preferencias"
                  onClick={onClose}
                  variant="ghost"
                >
                  Definir meu nome
                </Button>
              </p>
            )}
            {!view.data.phone && (
              <p>
                Este contato está sem telefone.{' '}
                <Button to="/gestao/clientes" onClick={onClose} variant="ghost">
                  Conferir contato
                </Button>
              </p>
            )}
            {view.data.has_name &&
              view.data.phone &&
              shown.trim() &&
              !/[{}]/.test(shown) && (
                <WhatsAppLink
                  variant="primary"
                  href={
                    'https://wa.me/' +
                    view.data.phone.replace(/\D/g, '') +
                    '?text=' +
                    encodeURIComponent(shown)
                  }
                >
                  Abrir no WhatsApp
                </WhatsAppLink>
              )}
            <Button
              disabled={!shown.trim()}
              onClick={() => {
                void navigator.clipboard
                  .writeText(shown)
                  .then(() =>
                    setNotice(
                      'Mensagem copiada. Confira o destinatário antes de enviar.',
                    ),
                  )
                  .catch(() =>
                    setNotice(
                      'Não foi possível copiar. Selecione o texto da prévia.',
                    ),
                  );
              }}
            >
              Copiar mensagem
            </Button>
          </>
        )}
        {notice && <p role="status">{notice}</p>}
        <Button className="sheet-close" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </dialog>
  );
}
function SampleExpenseSheet({
  costs,
  name,
  onClose,
  onSaved,
}: {
  costs: VisitCosts;
  name: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null),
    pending = useRef(false),
    request = useRef({ body: '', key: crypto.randomUUID() });
  const [amount, setAmount] = useState<number | null>(null),
    [method, setMethod] = useState('cash'),
    [day, setDay] = useState(localDay),
    [notes, setNotes] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    trigger.current = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => trigger.current?.focus();
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      if (amount === null || amount <= 0)
        throw Error('Informe o valor efetivamente pago, acima de zero.');
      const data = {
          version: costs.visit_version,
          estimate_hash: costs.estimate_hash,
          amount_cents: amount,
          method,
          spent_on: day,
          notes,
        },
        body = JSON.stringify(data);
      if (request.current.body !== body)
        request.current = { body, key: crypto.randomUUID() };
      await api(
        'visits/' + costs.visit_id + '/sample-expense',
        'POST',
        data,
        request.current.key,
      );
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="help-sheet"
      aria-label="Registrar despesa de amostras"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="sheet-body">
        <h2>Registrar despesa de amostras</h2>
        <p>{name} · Amostras e prospecção</p>
        <p>
          Informe um pagamento que ainda não consta nas despesas. A estimativa
          não comprova pagamento; não relance ingredientes já pagos.
        </p>
        <p>Estimativa atual: {cost(costs.estimate.estimated_cents)}</p>
        <Failure message={error} />
        <form className="data-form" onSubmit={(e) => void save(e)}>
          <fieldset disabled={busy} className="customer-form-fields">
            <MoneyInput
              label="Valor efetivamente pago (R$)"
              value={amount}
              onValueChange={setAmount}
            />
            <label>
              Data do pagamento
              <input
                required
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </label>
            <div className="chips" role="group" aria-label="Forma de pagamento">
              {Object.entries(paymentMethods).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant="chip"
                  aria-pressed={method === value}
                  onClick={() => setMethod(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <label>
              Observação do pagamento
              <textarea
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <Button
              variant="primary"
              loading={busy}
              disabled={busy || amount === null || amount <= 0}
            >
              Registrar despesa paga de amostras
            </Button>
            <Button type="button" disabled={busy} onClick={onClose}>
              Cancelar
            </Button>
          </fieldset>
        </form>
      </div>
    </dialog>
  );
}
function VisitCostDetails({
  visit,
  onChanged,
}: {
  visit: ProspectVisit;
  onChanged: () => void;
}) {
  const view = useRemote<VisitCosts>('visits/' + visit.id + '/costs'),
    [show, setShow] = useState(false),
    [notice, setNotice] = useState('');
  return (
    <section aria-label="Custos da visita">
      <Failure message={view.error} />
      {!view.data && !view.error && (
        <SkeletonList label="Calculando estimativa…" count={1} />
      )}
      {view.data && (
        <>
          <p>
            Estimativa das amostras:{' '}
            <strong>{cost(view.data.estimate.estimated_cents)}</strong>
          </p>
          <p>
            Fichas atuais, por unidade/peso conhecido. Inclui forminha e
            adicional configurado na ficha por peso. Não presume caixa, iFood ou
            opcionais.
          </p>
          {view.data.estimate.lines.map((l, i) => (
            <p key={i}>
              {l.units} un. {l.name}
              {l.weight_grams ? ' · ' + l.weight_grams + ' g' : ''} ·{' '}
              {cost(l.estimated_cost_cents)}
            </p>
          ))}
          {!!view.data.estimate.missing.length && (
            <>
              <p>
                Subtotal conhecido: {money(view.data.estimate.known_cents)}. Há
                custos pendentes:
              </p>
              <ul>
                {view.data.estimate.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <Button to="/gestao/fichas" variant="ghost">
                Conferir fichas
              </Button>
            </>
          )}
          <p>Corridas pagas, líquidas: {money(view.data.rides_cents)}</p>
          {view.data.expense && (
            <p>
              Despesa de amostras registrada:{' '}
              {money(view.data.expense.amount_cents)} ·{' '}
              {civilDate(view.data.expense.spent_on)}.{' '}
              <Button to="/gestao/despesas" variant="ghost">
                Ver Despesas
              </Button>
            </p>
          )}
          <p>
            Custo utilizado: <strong>{cost(view.data.total_cost_cents)}</strong>
            . Usa pagamento de amostras registrado quando houver; estimativa nos
            demais, mais corridas uma vez.
          </p>
          {view.data.can_register_expense && !view.data.expense && (
            <Button onClick={() => setShow(true)}>
              Registrar despesa de amostras
            </Button>
          )}
          <Button variant="ghost" onClick={() => void view.refresh()}>
            Atualizar custos
          </Button>
          {show && (
            <SampleExpenseSheet
              costs={view.data}
              name={visit.customer_name}
              onClose={() => setShow(false)}
              onSaved={() => {
                setNotice('Despesa de amostras registrada no financeiro.');
                void view.refresh();
                onChanged();
              }}
            />
          )}
        </>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
export function VisitCostPanel(props: {
  visit: ProspectVisit;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <DisclosureSummary>Custos e despesas das amostras</DisclosureSummary>
      {open && <VisitCostDetails {...props} />}
    </details>
  );
}
export function ProspectReportPage() {
  const [from, setFrom] = useState(() => localDay().slice(0, 8) + '01'),
    [to, setTo] = useState(localDay),
    view = useRemote<ProspectReport>(
      `prospecting/report?from=${from}&to=${to}`,
    );
  return (
    <>
      <h1>Prospecção</h1>
      <p>Visitas registradas e conversões, no horário local.</p>
      <div className="prospect-actions">
        <label>
          De
          <input
            type="date"
            required
            value={from}
            onChange={(e) => {
              if (e.target.value) setFrom(e.target.value);
            }}
          />
        </label>
        <label>
          Até
          <input
            type="date"
            required
            value={to}
            onChange={(e) => {
              if (e.target.value) setTo(e.target.value);
            }}
          />
        </label>
        <Button onClick={() => void view.refresh()}>Atualizar relatório</Button>
      </div>
      <Failure message={view.error} />
      {!view.data && !view.error && (
        <SkeletonList label="Carregando relatório de prospecção…" />
      )}
      {view.data && (
        <>
          <div className="summary-grid">
            {[
              ['Visitas registradas', view.data.visits],
              ['Visitas a contatos', view.data.prospect_visits],
              ['Visitas a clientes atuais', view.data.customer_visits],
              ['Contatos visitados', view.data.visited_contacts],
              ['Convertidos deste grupo', view.data.cohort_converted],
              [
                'Conversões no período com visita anterior',
                view.data.conversions,
              ],
            ].map(([label, n]) => (
              <section className="panel" key={label}>
                <h2>{label}</h2>
                <strong className="big-number">{n}</strong>
              </section>
            ))}
          </div>
          <section className="panel">
            <h2>Conversão e tempo de relacionamento</h2>
            <p>
              Grupo visitado:{' '}
              {view.data.cohort_rate === null
                ? 'Sem visitas para calcular'
                : view.data.cohort_rate.toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  }) + '%'}{' '}
              · {view.data.cohort_converted} de {view.data.visited_contacts}{' '}
              contatos únicos que receberam visita no período e converteram até{' '}
              {civilDate(to)}.
            </p>
            <p>
              Tempo médio desde a primeira visita até converter:{' '}
              {view.data.average_days === null
                ? 'Sem conversões com visita registrada'
                : view.data.average_days.toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  }) + ' dias corridos'}
              .
            </p>
            {view.data.conversions_without_visits > 0 && (
              <p>
                {view.data.conversions_without_visits} conversões no período sem
                visita anterior registrada, mostradas separadamente.
              </p>
            )}
          </section>
          <section className="panel">
            <h2>Custos das visitas a contatos no período</h2>
            <p>
              Amostras pela ficha atual:{' '}
              {cost(view.data.estimated_samples_cents)}
            </p>
            <p>
              Subtotal de estimativas conhecidas:{' '}
              {money(view.data.known_estimated_samples_cents)}
            </p>
            <p>
              Pagamentos registrados de amostras:{' '}
              {money(view.data.paid_samples_cents)} · Corridas líquidas:{' '}
              {money(view.data.rides_cents)}
            </p>
            <p>
              Custo utilizado:{' '}
              <strong>{cost(view.data.cost_used_cents)}</strong>. Pagamento
              registrado substitui a estimativa da amostra; corridas entram uma
              vez.
            </p>
            <p>Estimativas sem pagamento registrado não são saída de caixa.</p>
          </section>
          <section className="panel">
            <h2>Relacionamento com clientes atuais</h2>
            <p>
              {view.data.customer_visits} visitas para apresentar novos
              sabores/opções.
            </p>
            <p>
              Custo utilizado: {cost(view.data.customer_cost_used_cents)}.
              Pagamentos registrados substituem estimativas; corridas líquidas
              entram uma vez. Estas visitas não entram no funil, na conversão
              nem no custo de aquisição.
            </p>
          </section>
          <section className="panel">
            <h2>Custo para conquistar um cliente</h2>
            <p>
              Média por convertido com visita registrada:{' '}
              <strong>{cost(view.data.acquisition_per_customer_cents)}</strong>
            </p>
            <p>
              Para os contatos que converteram entre {civilDate(from)} e{' '}
              {civilDate(to)}, soma do custo das visitas anteriores à conversão,
              incluindo histórico de outros períodos. Pagamentos de amostras
              registrados substituem estimativas; corridas são líquidas.
            </p>
            <p>
              Total desse grupo: {cost(view.data.acquisition_total_cents)} ·
              Subtotal conhecido: {money(view.data.acquisition_known_cents)}
            </p>
          </section>
          {!!view.data.missing.length && (
            <section className="panel">
              <h2>Estimativas pendentes</h2>
              <ul>
                {view.data.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </section>
          )}
          <section className="panel">
            <h2>Amostras e sabores associados às conversões</h2>
            <p>
              {view.data.top_flavor
                ? view.data.top_flavor.name +
                  ' · ' +
                  view.data.top_flavor.converted +
                  ' contatos convertidos deste grupo.'
                : 'Ainda não há sabor associado a conversão neste grupo.'}
            </p>
            <p>
              Um contato pode ter recebido mais de um sabor. A conversão
              considera quem recebeu o sabor no período e virou cliente até a
              data final.
            </p>
            {view.data.flavors.map((f, i) => (
              <div className="prospect-flavor-result" key={i}>
                <h3>
                  {f.name} ·{' '}
                  {f.weight_grams ? f.weight_grams + ' g' : 'Peso a definir'}
                </h3>
                <p>
                  {f.units} un. · {f.contacts} contatos · {f.converted}{' '}
                  convertidos ·{' '}
                  {f.rate === null
                    ? 'Taxa indisponível'
                    : f.rate.toLocaleString('pt-BR', {
                        maximumFractionDigits: 1,
                      }) + '%'}
                </p>
                <p>Estimativa das unidades: {cost(f.cost_cents)}</p>
              </div>
            ))}
          </section>
        </>
      )}
    </>
  );
}

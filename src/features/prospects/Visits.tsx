import { WhatsAppLink } from '../../components/TestEnvironment';
import { usePrompt } from '../../components/confirm-context';
import { VisitCustomerPicker } from './VisitCustomerPicker';
import { HelpTip } from '../../components/HelpTip';
import { DayCalendar } from '../operations/DayCalendar';
import { FollowupSheet, VisitCostPanel } from './Followup';
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Car, MapPin, MessageCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { SkeletonList } from '../../components/Skeleton';
import { QuantityInput } from '../../components/NumericInputs';
import { DisclosureSummary } from '../../components/DisclosureSummary';
import { api, dateTime } from '../api';
import { useRemote, Failure, localDay } from '../operations/common';
import { useField, SiteAvatar, StaffIdentity } from '../field/FieldContext';
import { RouteInfo } from '../field/RouteInfo';
import { TravelSheet } from '../field/TravelSheet';
import { ReminderSheet } from '../p1/ReminderSheet';
import { emptyPlace, transportLinks } from '../../../shared/field';
import { photoURL } from '../../../shared/flavors';
import { shiftDay } from '../../../shared/workday';
import {
  visitLabels,
  type ProspectVisit,
  type VisitSample,
} from '../../../shared/visits';
const localInput = (at: string) =>
  new Date(Date.parse(at) - 10800000).toISOString().slice(0, 16);
const nowInput = () => localInput(new Date().toISOString());
type Product = {
  historical?: boolean;
  id: string;
  name: string;
  photo_key: string | null;
  variants: { active: number; weight_grams: number }[];
};
function VisitActions({
  visit,
  followup,
}: {
  visit: ProspectVisit;
  followup: boolean;
}) {
  const field = useField(),
    sheet = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null);
  const place =
      field?.data?.sites.find((s) => s.id === visit.customer_id)?.data ??
      emptyPlace(),
    links = transportLinks(place);
  const [notice, setNotice] = useState(''),
    [messageOpen, setMessageOpen] = useState(false);
  const hasPlace = !!place.address || place.latitude !== null;
  const destination =
    place.latitude !== null && place.longitude !== null
      ? `${place.latitude},${place.longitude}`
      : place.address;
  return (
    <>
      {messageOpen && (
        <FollowupSheet visit={visit} onClose={() => setMessageOpen(false)} />
      )}
      <div className="delivery-icon-row">
        <Button
          disabled={!hasPlace}
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            trigger.current = e.currentTarget;
            sheet.current?.showModal();
          }}
        >
          <MapPin aria-hidden="true" size={22} />
          Mapa
        </Button>
        {followup ? (
          <Button onClick={() => setMessageOpen(true)}>
            <MessageCircle aria-hidden="true" size={22} />
            WhatsApp
          </Button>
        ) : (
          <WhatsAppLink
            href={'https://wa.me/' + visit.phone.replace(/\D/g, '')}
            disabled={!visit.phone}
          >
            <MessageCircle aria-hidden="true" size={22} />
            WhatsApp
          </WhatsAppLink>
        )}
        <Button
          href={links.uber}
          disabled={!hasPlace}
          target="_blank"
          rel="noreferrer"
        >
          <Car aria-hidden="true" size={22} />
          Uber
        </Button>
        <Button
          disabled={!place.address}
          onClick={() => {
            void navigator.clipboard
              .writeText(place.address)
              .then(() =>
                setNotice('Endereço copiado. Abra a 99 e cole no destino.'),
              )
              .catch(() =>
                setNotice(
                  'Não foi possível copiar; confira o endereço em Mapa.',
                ),
              );
          }}
        >
          <Car aria-hidden="true" size={22} />
          99
        </Button>
      </div>
      {notice && <p role="status">{notice}</p>}
      <dialog
        ref={sheet}
        className="help-sheet"
        aria-label={'Rota da visita a ' + visit.customer_name}
        onClose={() => trigger.current?.focus()}
      >
        <div className="sheet-body">
          <h2>Rota até {visit.customer_name}</h2>
          <p>{place.address || 'Localização cadastrada'}</p>
          <RouteInfo id={visit.customer_id} />
          <div className="prospect-actions">
            <Button
              href={links.maps + '&travelmode=driving'}
              target="_blank"
              rel="noreferrer"
            >
              Google Maps
            </Button>
            <Button href={links.waze} target="_blank" rel="noreferrer">
              Waze
            </Button>
            <Button
              href={
                'https://maps.apple.com/?daddr=' +
                encodeURIComponent(destination) +
                '&dirflg=d'
              }
              target="_blank"
              rel="noreferrer"
            >
              Mapas do iPhone
            </Button>
          </div>
          <Button onClick={() => sheet.current?.close()}>Fechar</Button>
        </div>
      </dialog>
    </>
  );
}
export function VisitSheet({
  visit,
  customerId,
  record = false,
  compact = false,
  onClose,
  onSaved,
}: {
  visit?: ProspectVisit;
  customerId?: string;
  record?: boolean;
  compact?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const field = useField(),
    products = useRemote<Product[]>('products');
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null),
    pending = useRef(false),
    request = useRef({ body: '', key: crypto.randomUUID() });
  const [customer, setCustomer] = useState(
      visit?.customer_id ?? customerId ?? '',
    ),
    [at, setAt] = useState(
      record ? nowInput() : visit ? localInput(visit.scheduled_at) : nowInput(),
    ),
    [notes, setNotes] = useState(record ? '' : (visit?.data.notes ?? '')),
    [lines, setLines] = useState<VisitSample[]>(visit?.data.samples ?? []),
    [performer, setPerformer] = useState(field?.data?.user_id ?? ''),
    [next, setNext] = useState(shiftDay(localDay(), 3) + 'T10:00'),
    [busy, setBusy] = useState(false),
    [creating, setCreating] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    trigger.current = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => trigger.current?.focus();
  }, []);
  const choices: Product[] = products.data
    ? [
        ...products.data,
        ...(record
          ? lines
              .filter((s) => !products.data!.some((p) => p.id === s.product_id))
              .map((s) => ({
                id: s.product_id,
                name: s.product_name,
                photo_key: s.photo_key,
                variants: [],
                historical: true,
              }))
          : []),
      ]
    : [];
  function change(p: Product, units: number, weight: number | null) {
    setLines((prev) => [
      ...prev.filter((s) => s.product_id !== p.id),
      ...(units
        ? [
            {
              product_id: p.id,
              product_name: p.name,
              photo_key: p.photo_key,
              weight_grams: weight,
              units,
            },
          ]
        : []),
    ]);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pending.current || creating) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      if (!record && !visit && !customer)
        throw Error('Escolha um contato ou cliente antes de agendar.');
      const sampleLines = lines
        .filter((s) => s.units > 0)
        .map(({ product_id, units, weight_grams }) => ({
          product_id,
          units,
          weight_grams,
        }));
      const data = record
        ? {
            version: visit!.version,
            occurred_at: new Date(at + ':00-03:00').toISOString(),
            ...(performer ? { performer_id: performer } : {}),
            next_step_at: next
              ? new Date(next + ':00-03:00').toISOString()
              : '',
            notes,
            samples: sampleLines,
          }
        : {
            customer_id: customer,
            scheduled_at: new Date(at + ':00-03:00').toISOString(),
            notes,
            samples: sampleLines,
            ...(visit ? { version: visit.version } : {}),
          };
      const body = JSON.stringify(data);
      if (request.current.body !== body)
        request.current = { body, key: crypto.randomUUID() };
      await api(
        'visits' + (visit ? '/' + visit.id : '') + (record ? '/record' : ''),
        visit && !record ? 'PUT' : 'POST',
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
      aria-label={
        record ? 'Registrar visita' : visit ? 'Editar visita' : 'Agendar visita'
      }
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="sheet-body">
        <h2>
          {record
            ? 'Registrar visita'
            : visit
              ? 'Editar visita'
              : 'Agendar visita'}
        </h2>
        <HelpTip topic="visits" />
        <Failure message={error || products.error} />
        {error && visit && (
          <Button
            onClick={() => {
              onSaved();
              onClose();
            }}
          >
            Fechar e atualizar visita
          </Button>
        )}
        <form className="data-form" onSubmit={(e) => void save(e)}>
          <fieldset
            disabled={busy || creating}
            className="customer-form-fields"
          >
            {visit ? (
              <p>{visit.customer_name}</p>
            ) : (
              <VisitCustomerPicker
                value={customer}
                onChange={setCustomer}
                onBusy={setCreating}
              />
            )}
            {!record && (
              <>
                <div className="chips" role="group" aria-label="Dia da visita">
                  {[
                    ['Hoje', localDay()],
                    ['Amanhã', shiftDay(localDay(), 1)],
                  ].map(([label, day]) => (
                    <Button
                      key={day}
                      type="button"
                      variant="chip"
                      aria-pressed={at.slice(0, 10) === day}
                      onClick={() => setAt(day + 'T' + at.slice(11, 16))}
                    >
                      {label}
                    </Button>
                  ))}
                  <DayCalendar
                    day={at.slice(0, 10)}
                    label="Escolher data"
                    onSelect={(day) => setAt(day + 'T' + at.slice(11, 16))}
                  />
                </div>
                <div
                  className="chips visit-time-chips"
                  role="group"
                  aria-label="Horário da visita"
                >
                  {['09:00', '14:00', '18:00'].map((time) => (
                    <Button
                      type="button"
                      key={time}
                      variant="chip"
                      aria-pressed={at.slice(11, 16) === time}
                      onClick={() => setAt(at.slice(0, 10) + 'T' + time)}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </>
            )}
            <label>
              {record
                ? 'Quando aconteceu (João Pessoa)'
                : 'Quando visitar (João Pessoa)'}
              <input
                required
                type="datetime-local"
                value={at}
                onChange={(e) => setAt(e.target.value)}
              />
            </label>
            {record && (
              <>
                <label>
                  Quem foi
                  <select
                    value={performer}
                    onChange={(e) => setPerformer(e.target.value)}
                  >
                    <option value="">Eu (quem está registrando)</option>
                    {field?.data?.staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.display_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Data do próximo passo
                  <input
                    type="datetime-local"
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                  />
                </label>
              </>
            )}
            <details open={!compact || record}>
              <DisclosureSummary>
                {record
                  ? 'Amostras deixadas'
                  : 'Amostras planejadas (opcional)'}
              </DisclosureSummary>
              <p>
                Unidades avulsas, sem cobrança. Peso é opcional: informe somente
                o conhecido. Sem amostras, deixe as quantidades em zero.
              </p>
              {!products.data && !products.error && (
                <SkeletonList label="Carregando sabores…" />
              )}
              {choices.map((p) => {
                const line = lines.find((s) => s.product_id === p.id),
                  weights = [
                    ...new Set(
                      p.variants
                        .filter((v) => v.active)
                        .map((v) => v.weight_grams),
                    ),
                  ],
                  weight = line
                    ? line.weight_grams
                    : weights.length === 1
                      ? weights[0]
                      : null;
                return (
                  <div className="visit-sample-row" key={p.id}>
                    {p.photo_key && (
                      <img
                        src={photoURL(p.photo_key)}
                        width={48}
                        height={48}
                        alt=""
                      />
                    )}
                    <div>
                      <strong>{p.name}</strong>
                      {p.historical && (
                        <small>Produto inativo · amostra planejada</small>
                      )}
                      <QuantityInput
                        label={'Unidades de ' + p.name}
                        min={0}
                        max={10000}
                        value={line?.units ?? 0}
                        onValueChange={(units) => change(p, units, weight)}
                      />
                      {!!line?.units && (
                        <label>
                          Peso por amostra de {p.name} (g, opcional)
                          <input
                            type="number"
                            min={1}
                            max={1000}
                            step={1}
                            value={weight ?? ''}
                            placeholder="A definir"
                            onChange={(e) =>
                              change(
                                p,
                                line.units,
                                e.target.value ? Number(e.target.value) : null,
                              )
                            }
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
              {products.data &&
                !record &&
                lines
                  .filter(
                    (s) => !products.data!.some((p) => p.id === s.product_id),
                  )
                  .map((s) => (
                    <p key={s.product_id} role="alert">
                      Sabor indisponível: {s.product_name}.{' '}
                      <Button
                        type="button"
                        onClick={() =>
                          setLines((prev) =>
                            prev.filter((l) => l.product_id !== s.product_id),
                          )
                        }
                      >
                        Remover das amostras
                      </Button>
                    </p>
                  ))}
            </details>
            <label>
              Observação da visita
              <textarea
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <p>
              {record
                ? 'Registrar não cria lembrete ou despesa. Você poderá escolher essas ações depois.'
                : 'O agendamento reserva amostras na produção; não cria pedido nem venda.'}
            </p>
            <Button
              variant="primary"
              loading={busy}
              disabled={busy || !products.data || (!visit && !customer)}
            >
              {record
                ? 'Salvar registro da visita'
                : visit
                  ? 'Salvar alterações da visita'
                  : 'Agendar visita'}
            </Button>
            <Button type="button" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
          </fieldset>
        </form>
      </div>
    </dialog>
  );
}
export function VisitCard({
  visit,
  onChanged,
  followup = false,
}: {
  visit: ProspectVisit;
  onChanged: () => void;
  followup?: boolean;
}) {
  const askPrompt = usePrompt();
  const field = useField(),
    [sheet, setSheet] = useState<'record' | 'edit' | null>(null),
    [reminder, setReminder] = useState(false),
    [trip, setTrip] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const cancelPending = useRef(false),
    cancelRequest = useRef({ body: '', key: '' });
  async function cancel() {
    if (cancelPending.current) return;
    const reason = await askPrompt('Motivo do cancelamento da visita', {
      minLength: 3,
      title: 'Cancelar visita',
      action: 'Cancelar visita',
    });
    if (!reason?.trim()) return;
    cancelPending.current = true;
    const payload = { version: visit.version, reason },
      signature = JSON.stringify(payload);
    if (cancelRequest.current.body !== signature)
      cancelRequest.current = { body: signature, key: crypto.randomUUID() };
    setBusy(true);
    setError('');
    try {
      await api(
        'visits/' + visit.id + '/cancel',
        'POST',
        payload,
        cancelRequest.current.key,
      );
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      cancelPending.current = false;
      setBusy(false);
    }
  }
  const samples = visit.record?.samples ?? visit.data.samples;
  return (
    <article
      className="panel visit-card"
      aria-label={
        (visit.data.audience === 'customer'
          ? 'Visita a cliente'
          : 'Visita de apresentação') +
        ' · ' +
        visit.customer_name
      }
    >
      <header className="visit-card-heading">
        <div className="visit-type-row">
          <strong>
            {visit.data.audience === 'customer'
              ? 'Visita a cliente'
              : 'Visita de apresentação'}
          </strong>
          <span className="status-tag">{visitLabels[visit.status]}</span>
        </div>
        <div className="visit-identity-row">
          <SiteAvatar id={visit.customer_id} name={visit.customer_name} />
          <div>
            <h3 title={visit.customer_name}>{visit.customer_name}</h3>
            <p>{dateTime(visit.scheduled_at)}</p>
          </div>
        </div>
      </header>
      <p>
        Objetivo:{' '}
        {visit.data.purpose === 'new_options'
          ? 'Novos sabores/opções'
          : 'Apresentação'}
      </p>
      <Failure message={error} />
      {error && <Button onClick={onChanged}>Atualizar visita</Button>}
      {notice && <p role="status">{notice}</p>}
      <p>
        {samples.length
          ? samples
              .map(
                (s) =>
                  `${s.units} un. ${s.product_name}${s.weight_grams ? ' · ' + s.weight_grams + ' g' : ''}`,
              )
              .join('; ')
          : 'Sem amostras informadas.'}
      </p>
      <VisitActions visit={visit} followup={followup} />
      {visit.status === 'scheduled' && (
        <>
          <Button
            variant="success"
            className="visit-record-action"
            size="large"
            onClick={() => setSheet('record')}
          >
            Registrar visita
          </Button>
          <div className="prospect-actions">
            <Button variant="ghost" onClick={() => setSheet('edit')}>
              Editar visita
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => void cancel()}
            >
              Cancelar visita
            </Button>
          </div>
        </>
      )}
      {visit.record && (
        <>
          <p>
            Quem foi: <StaffIdentity id={visit.record.performer_id} />
          </p>
          <p>
            {dateTime(visit.record.occurred_at)} · {visit.record.notes}
          </p>
          <p>
            Próximo passo:{' '}
            {visit.record.next_step_at
              ? dateTime(visit.record.next_step_at)
              : 'a definir'}
          </p>
          <div className="prospect-actions">
            {visit.record.next_step_at && (
              <Button onClick={() => setReminder(true)}>
                Criar lembrete de retorno
              </Button>
            )}
            {field && (
              <Button onClick={() => setTrip(true)}>
                Registrar corrida de prospecção
              </Button>
            )}
          </div>
          <p>São ofertas: nada foi criado sem sua confirmação.</p>
        </>
      )}
      {followup && visit.record && (
        <VisitCostPanel visit={visit} onChanged={onChanged} />
      )}
      {sheet && (
        <VisitSheet
          visit={visit}
          record={sheet === 'record'}
          onClose={() => setSheet(null)}
          onSaved={onChanged}
        />
      )}
      {reminder && visit.record?.next_step_at && (
        <ReminderSheet
          day={localDay()}
          initial={{
            title: ('Retornar para ' + visit.customer_name).slice(0, 160),
            due_at: visit.record.next_step_at,
            customer_id: visit.customer_id,
          }}
          onClose={() => setReminder(false)}
          onSaved={() => {
            setReminder(false);
            setNotice('Lembrete salvo. Confira os avisos em Lembretes.');
            window.dispatchEvent(new Event('reminders-changed'));
          }}
        />
      )}
      {trip && (
        <TravelSheet
          orders={[]}
          visit={visit}
          onClose={() => setTrip(false)}
          onSaved={() =>
            setNotice('Corrida e despesa de prospecção registradas.')
          }
        />
      )}
      <details>
        <DisclosureSummary>Dados do agendamento</DisclosureSummary>
        <p>
          {visit.data.cancel_reason || visit.data.notes || 'Sem observações.'}
        </p>
        <Button
          to={'/gestao/visitas?contato=' + visit.customer_id}
          variant="ghost"
        >
          Visitas e amostras deste contato
        </Button>
      </details>
    </article>
  );
}
function ContactScheduleButton({
  id,
  onOpen,
}: {
  id: string;
  onOpen: () => void;
}) {
  const view = useRemote<{ kind?: string; active: number }>('customers/' + id);
  return view.data?.active ? (
    <Button variant="primary" onClick={onOpen}>
      Agendar visita
    </Button>
  ) : null;
}
export function VisitsPage({ followup = false }: { followup?: boolean }) {
  const { id } = useParams(),
    [search, setSearch] = useSearchParams(),
    customerId = search.get('contato') || undefined,
    [show, setShow] = useState(search.get('agendar') === '1'),
    [filterPeriod, setFilterPeriod] = useState(false),
    [from, setFrom] = useState(() => localDay()),
    [to, setTo] = useState(() => shiftDay(localDay(), 6));
  const view = useRemote<ProspectVisit | ProspectVisit[]>(
    id
      ? 'visits/' + id
      : 'visits?' +
          (customerId
            ? 'customer_id=' +
              encodeURIComponent(customerId) +
              (filterPeriod ? `&from=${from}&to=${to}` : '')
            : `from=${from}&to=${to}`),
  );
  const visitRefresh = view.refresh;
  useEffect(() => {
    const update = () => void visitRefresh();
    window.addEventListener('visits-changed', update);
    return () => window.removeEventListener('visits-changed', update);
  }, [visitRefresh]);
  const list = view.data
    ? Array.isArray(view.data)
      ? view.data
      : [view.data]
    : [];
  return (
    <>
      <h1>Visitas e amostras</h1>
      <Button to="/gestao/clientes" variant="ghost">
        Voltar para Clientes
      </Button>
      <Failure message={view.error} />
      <Button variant="ghost" onClick={() => void view.refresh()}>
        Atualizar visitas
      </Button>
      {!id && (
        <>
          {customerId ? (
            <ContactScheduleButton
              id={customerId}
              onOpen={() => setShow(true)}
            />
          ) : (
            <Button variant="primary" onClick={() => setShow(true)}>
              Agendar visita
            </Button>
          )}
          {customerId && (
            <label>
              <input
                type="checkbox"
                checked={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.checked)}
              />
              Filtrar visitas por período
            </label>
          )}
          {(!customerId || filterPeriod) && (
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
            </div>
          )}
        </>
      )}
      {!view.data && !view.error && (
        <SkeletonList label="Carregando visitas…" />
      )}
      {view.data && list.length === 0 && <p>Nenhuma visita neste período.</p>}
      {list.map((v) => (
        <VisitCard
          key={v.id + ':' + v.version}
          visit={v}
          followup={followup}
          onChanged={() => void view.refresh()}
        />
      ))}
      {show && (
        <VisitSheet
          customerId={customerId}
          onClose={() => {
            setShow(false);
            if (search.has('agendar')) {
              const next = new URLSearchParams(search);
              next.delete('agendar');
              setSearch(next, { replace: true });
            }
          }}
          onSaved={() => void view.refresh()}
        />
      )}
    </>
  );
}

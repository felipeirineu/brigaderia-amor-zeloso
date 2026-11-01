import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRemote, Failure, localDay } from '../operations/common';
import { civilDate, dateTime } from '../api';
import { privateDownload } from '../PrivateDownload';
import { addCivilDays } from '../../../shared/finance';
export function Agenda() {
  const [day, setDay] = useState(localDay),
    [mode, setMode] = useState<'week' | 'month'>('week'),
    [kind, setKind] = useState(''),
    [error, setError] = useState('');
  const date = new Date(day + 'T12:00:00Z'),
    from =
      mode === 'month'
        ? day.slice(0, 8) + '01'
        : addCivilDays(day, -((date.getUTCDay() + 6) % 7)),
    to =
      mode === 'month'
        ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
            .toISOString()
            .slice(0, 10)
        : addCivilDays(from, 6),
    query = `from=${from}&to=${to}${kind ? '&kind=' + kind : ''}`;
  const view = useRemote<{
    events: {
      id: string;
      title: string;
      date: string;
      at?: string;
      kind: string;
      href: string;
    }[];
  }>(`p1/calendar?${query}`);
  return (
    <>
      <h1>Agenda</h1>
      <p>
        Semana/mês no fuso de Fortaleza. Produção é planejada para o prazo do
        pedido, sem horário de produção inventado.
      </p>
      <Failure message={error || view.error} />
      <label>
        Data de referência
        <input
          required
          type="date"
          value={day}
          onChange={(e) => {
            if (e.target.value) setDay(e.target.value);
          }}
        />
      </label>
      <div className="chips">
        {(['week', 'month'] as const).map((v) => (
          <button key={v} aria-pressed={mode === v} onClick={() => setMode(v)}>
            {v === 'week' ? 'Semana' : 'Mês'}
          </button>
        ))}
      </div>
      <label>
        Eventos
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Todos</option>
          <option value="delivery">Pedidos/entregas</option>
          <option value="production">Produção planejada</option>
          <option value="closing">Fechamentos</option>
          <option value="due">Vencimentos</option>
          <option value="reminder">Lembretes</option>
        </select>
      </label>
      <p>
        {civilDate(from)} a {civilDate(to)}
      </p>
      <button
        onClick={() =>
          void privateDownload(
            'p1/calendar.ics?' + query,
            'agenda-amor-zeloso.ics',
          ).catch((e) => setError(e.message))
        }
      >
        Exportar agenda ICS
      </button>
      <p>
        O arquivo contém dados privados. Importe somente no calendário
        autorizado; o app não publica um calendário nem envia notificações.
      </p>
      {view.data?.events.length === 0 && <p>Nenhum evento neste período.</p>}
      {view.data?.events.map((e) => (
        <article className="panel" key={e.id}>
          <h2>{e.title}</h2>
          <p>{e.at ? dateTime(e.at) : civilDate(e.date)}</p>
          <Link to={e.href}>Abrir registro</Link>
        </article>
      ))}
    </>
  );
}

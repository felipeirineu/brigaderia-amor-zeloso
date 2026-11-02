import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { useRemote, Failure, localDay } from './common';
import {
  dayChip,
  shiftDay,
  shiftMonth,
  monthTitle,
} from '../../../shared/workday';
function CalendarSheet({
  day,
  onSelect,
  onClose,
}: {
  day: string;
  onSelect: (day: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [month, setMonth] = useState(day.slice(0, 7)),
    [manual, setManual] = useState(day);
  const view = useRemote<{
    month: string;
    counts: { day: string; count: number }[];
  }>(`today/calendar?month=${month}`);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const first = new Date(month + '-01T12:00Z'),
    offset = first.getUTCDay(),
    last = new Date(shiftMonth(month, 1) + '-01T12:00Z');
  last.setUTCDate(0);
  return (
    <dialog
      ref={dialog}
      className="help-sheet day-calendar"
      aria-label="Escolher dia de trabalho"
      onClose={onClose}
    >
      <div className="sheet-body">
        <div className="calendar-month">
          <Button
            aria-label="Mês anterior"
            disabled={month === '1900-01'}
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <h2 aria-live="polite">{monthTitle(month)}</h2>
          <Button
            aria-label="Próximo mês"
            disabled={month === '2199-12'}
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <Failure message={view.error} />
        {!view.data && !view.error && (
          <p role="status">Carregando contagens…</p>
        )}
        <div className="calendar-grid">
          <div className="calendar-weekdays" aria-hidden="true">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((s, i) => (
              <span key={i}>{s}</span>
            ))}
          </div>
          {Array.from({ length: offset }, (_, i) => (
            <span key={'blank' + i} />
          ))}
          {Array.from({ length: last.getUTCDate() }, (_, i) => {
            const date = month + '-' + String(i + 1).padStart(2, '0'),
              count = view.data?.counts.find((c) => c.day === date)?.count;
            return (
              <Button
                key={date}
                className={date === localDay() ? 'calendar-today' : ''}
                variant="chip"
                aria-label={`${date}${view.data ? `, ${count ?? 0} entregas` : ', contagem indisponível'}`}
                aria-pressed={day === date}
                onClick={() => onSelect(date)}
              >
                <span>
                  {i + 1}
                  {view.data && (count ?? 0) > 0 && <small>{count}</small>}
                </span>
              </Button>
            );
          })}
        </div>
        <div className="chips">
          <Button variant="chip" onClick={() => onSelect(localDay())}>
            Hoje
          </Button>
          <Button
            variant="chip"
            onClick={() => onSelect(shiftDay(localDay(), 1))}
          >
            Amanhã
          </Button>
        </div>
        <label>
          Ir para data
          <input
            type="date"
            min="1900-01-01"
            max="2199-12-31"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
        </label>
        <Button
          disabled={
            !/^\d{4}-\d{2}-\d{2}$/.test(manual) ||
            manual < '1900-01-01' ||
            manual > '2199-12-31'
          }
          onClick={() => onSelect(manual)}
        >
          Ver dia
        </Button>
        <Button variant="ghost" onClick={() => dialog.current?.close()}>
          Fechar calendário
        </Button>
      </div>
    </dialog>
  );
}
export function DayCalendar({
  day,
  onSelect,
}: {
  day: string;
  onSelect: (d: string) => void;
}) {
  const [open, setOpen] = useState(false),
    trigger = useRef<HTMLButtonElement>(null);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <>
      <Button
        ref={trigger}
        variant="tonal"
        className="workday-calendar-trigger"
        aria-label="Escolher dia"
        onClick={() => setOpen(true)}
      >
        <CalendarDays size={16} aria-hidden="true" />
        {dayChip(day)}
        <ChevronDown size={16} aria-hidden="true" />
      </Button>
      {open && (
        <CalendarSheet
          day={day}
          onClose={close}
          onSelect={(d) => {
            onSelect(d);
            close();
          }}
        />
      )}
    </>
  );
}

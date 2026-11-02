import type { ReactNode } from 'react';
import { fortalezaDay, shiftDay } from '../../shared/workday';
import { Button } from './Button';
export function DayShortcuts({
  day,
  onChange,
  children,
}: {
  day: string;
  onChange: (day: string) => void;
  children?: ReactNode;
}) {
  const today = fortalezaDay();
  return (
    <div className="chips" role="group" aria-label="Atalhos de dia">
      {[
        ['Hoje', today],
        ['Amanhã', shiftDay(today, 1)],
      ].map(([label, value]) => (
        <Button
          key={value}
          type="button"
          variant="chip"
          aria-pressed={day === value}
          onClick={() => onChange(value)}
        >
          {label}
        </Button>
      ))}
      {children}
    </div>
  );
}
export function TimeShortcuts({
  time,
  onChange,
  options = ['09:00', '14:00', '18:00'],
}: {
  time: string;
  onChange: (time: string) => void;
  options?: string[];
}) {
  return (
    <div className="chips" role="group" aria-label="Atalhos de horário">
      {[...new Set(options)].map((value) => (
        <Button
          key={value}
          type="button"
          variant="chip"
          aria-pressed={time === value}
          onClick={() => onChange(value)}
        >
          {value}
        </Button>
      ))}
    </div>
  );
}

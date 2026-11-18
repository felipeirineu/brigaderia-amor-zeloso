import { describe, expect, it } from 'vitest';
import {
  backupDueAt,
  backupIsDue,
  backupLastLabel,
  type BackupReminder,
} from './backup-reminder';
const base = (overrides: Partial<BackupReminder> = {}): BackupReminder => ({
  id: 'DEMONSTRAÇÃO',
  period: 'weekly',
  weekday: 1,
  time: '09:00',
  last_backup_at: '2026-11-09T13:00:00.000Z',
  snoozed_until: null,
  created_at: '2026-11-04T12:00:00.000Z',
  alert_key: 'DEMONSTRAÇÃO',
  version: 1,
  ...overrides,
});
describe('lembrete de backup no horário local', () => {
  it('padrão semanal não pula uma semana se o backup foi depois das9h', () => {
    expect(backupDueAt(base())).toBe('2026-11-16T12:00:00.000Z');
    expect(backupIsDue(base(), new Date('2026-11-16T11:59:59Z'))).toBe(false);
    expect(backupIsDue(base(), new Date('2026-11-16T12:00:00Z'))).toBe(true);
  });
  it('15 dias arredonda para a próxima janela escolhida, não14', () => {
    expect(backupDueAt(base({ period: 'fortnightly' }))).toBe(
      '2026-11-30T12:00:00.000Z',
    );
  });
  it('mês conserva o dia quando possível e limita ao último dia no ano bissexto', () => {
    expect(
      backupDueAt(
        base({
          period: 'monthly',
          last_backup_at: '2026-01-31T15:00Z',
          weekday: 6,
        }),
      ),
    ).toBe('2026-02-28T12:00:00.000Z');
    expect(
      backupDueAt(
        base({
          period: 'monthly',
          last_backup_at: '2024-01-31T15:00Z',
          weekday: 4,
        }),
      ),
    ).toBe('2024-02-29T12:00:00.000Z');
  });
  it('virada de dia usa Fortaleza e não a data UTC', () => {
    expect(backupDueAt(base({ last_backup_at: '2026-11-10T02:59:00Z' }))).toBe(
      '2026-11-16T12:00:00.000Z',
    );
    expect(backupDueAt(base({ last_backup_at: '2026-11-10T03:00:00Z' }))).toBe(
      '2026-11-23T12:00:00.000Z',
    );
  });
  it('sem backup usa a janela da semana inicial sem mudar o vencimento a cada cron', () => {
    const s = base({ last_backup_at: null });
    expect(backupDueAt(s)).toBe('2026-11-02T12:00:00.000Z');
    expect(backupLastLabel(s)).toBe('Nenhum backup feito ainda');
  });
  it('adiamento vence exatamente uma hora depois e não antecipa janela futura', () => {
    const s = base({ snoozed_until: '2026-11-18T15:00:00.000Z' });
    expect(backupDueAt(s)).toBe(s.snoozed_until);
    expect(backupIsDue(s, new Date('2026-11-18T14:59:59Z'))).toBe(false);
    expect(backupIsDue(s, new Date('2026-11-18T15:00:00Z'))).toBe(true);
    expect(backupDueAt(base({ snoozed_until: '2026-11-10T12:00:00Z' }))).toBe(
      '2026-11-16T12:00:00.000Z',
    );
  });
  it('desligado não vence mesmo com adiamento antigo', () => {
    expect(
      backupDueAt(
        base({ period: 'off', snoozed_until: '2020-01-01T12:00:00Z' }),
      ),
    ).toBeNull();
  });
  it('data e contagem de dias civis locais, inclusive antes das3h UTC', () => {
    expect(backupLastLabel(base(), new Date('2026-11-18T02:00:00Z'))).toBe(
      'Último backup: 09/11 (há 8 dias)',
    );
  });
});

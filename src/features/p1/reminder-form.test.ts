import { expect, it } from 'vitest';
import { alertPayload, editAlert, emptyAlert } from './reminder-form';
it('atalhos preservam antecedência e outro horário preserva instante de Fortaleza', () => {
  const due = '2030-01-01T13:00:00.000Z';
  for (const [mode, minutes] of [
    ['0', 0],
    ['15', 15],
    ['60', 60],
    ['1440', 1440],
  ] as const) {
    const payload = alertPayload(
      { ...emptyAlert(), mode, recipients: ['DEMONSTRACAO'] },
      due,
    );
    expect(Date.parse(due) - Date.parse(payload.alert_at!)).toBe(
      minutes * 60000,
    );
    expect(editAlert(due, payload.alert_at, ['DEMONSTRACAO']).mode).toBe(mode);
  }
  const form = editAlert(due, '2030-01-01T12:37:00.000Z');
  expect(form.mode).toBe('custom');
  expect(form.custom).toBe('2030-01-01T09:37');
  expect(alertPayload(form, due).alert_at).toBe('2030-01-01T12:37:00.000Z');
  expect(alertPayload(emptyAlert(), due).alert_at).toBeNull();
  expect(() =>
    alertPayload({ ...emptyAlert(), mode: 'custom' }, due),
  ).toThrow();
});

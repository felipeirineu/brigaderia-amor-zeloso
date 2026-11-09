export interface AlertForm {
  mode: 'none' | '0' | '15' | '60' | '1440' | 'custom';
  custom: string;
  recipients?: string[];
}
export const emptyAlert = (): AlertForm => ({ mode: 'none', custom: '' });
export function editAlert(
  due: string,
  alert?: string | null,
  recipients?: string[],
): AlertForm {
  if (!alert) return { ...emptyAlert(), recipients };
  const minutes = String((Date.parse(due) - Date.parse(alert)) / 60000);
  return {
    mode: ['0', '15', '60', '1440'].includes(minutes)
      ? (minutes as AlertForm['mode'])
      : 'custom',
    custom: new Date(Date.parse(alert) - 10800000).toISOString().slice(0, 16),
    recipients,
  };
}
export function alertPayload(form: AlertForm, due: string) {
  if (
    form.mode === 'custom' &&
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(form.custom)
  )
    throw Error('Informe data e hora do aviso.');
  const date =
    form.mode === 'custom'
      ? new Date(form.custom + ':00-03:00')
      : new Date(Date.parse(due) - Number(form.mode) * 60000);
  if (form.mode !== 'none' && !Number.isFinite(date.getTime()))
    throw Error('Informe data e hora do aviso.');
  return {
    alert_at: form.mode === 'none' ? null : date.toISOString(),
    ...(form.recipients ? { recipient_ids: form.recipients } : {}),
  };
}

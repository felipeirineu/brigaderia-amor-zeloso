/** Política pura: não abre banco, não lê credenciais e não escreve dados. */
export class ActivationCheckError extends Error {}
export function validateActivation(report, { after = false } = {}) {
  const fail = (text) => {
    throw new ActivationCheckError(text);
  };
  if (
    !report ||
    !Array.isArray(report.pending) ||
    !report.counts ||
    !Number.isInteger(report.foreign_key_violations)
  )
    fail('Pré-checagem incompleta. Pare e confira a configuração.');
  if (report.foreign_key_violations !== 0)
    fail('Há vínculos inválidos. Não aplique migrações nem ative flags.');
  const existing =
    report.counts.organizations !== null || report.counts.orders !== null;
  if (existing && report.pending.some((n) => /^000[12]_/.test(n)))
    fail(
      'Banco existente sem histórico inicial completo. Reconcile 0001/0002 seguindo o guia; não reaplique por tentativa.',
    );
  if (
    after &&
    (report.pending.length ||
      ![
        'schema_operations_ready',
        'schema_finance_ready',
        'schema_p1_ready',
        'schema_mobile_ready',
        'schema_field_ready',
        'schema_tools_ready',
        'generated_condition_columns',
      ].every((key) => report[key] === true))
  )
    fail('Schema ainda incompleto. Preserve o backup e não ative flags.');
  return true;
}

import type { Env } from './security';

/**
 * Papel "Desenvolvedor": administrador de suporte técnico, marcado pelo
 * segredo DEVELOPER_EMAILS (e-mails separados por vírgula) para não expor
 * e-mails no código. Mantém as permissões de administrador, mas sai das
 * escolhas de equipe da operação (entregas, visitas, avisos de outros).
 */
export function developerEmails(env: Pick<Env, 'DEVELOPER_EMAILS'>): string[] {
  return [
    ...new Set(
      (env.DEVELOPER_EMAILS ?? '')
        .split(/[,;\s]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^@\s]+@[^@\s]+$/.test(e)),
    ),
  ].slice(0, 10);
}

/** Condição SQL: o membro `alias` não é desenvolvedor. Um parâmetro (JSON). */
export const notDeveloper = (alias: string) =>
  `NOT EXISTS(SELECT 1 FROM users du WHERE du.id=${alias}.user_id AND lower(du.email) IN(SELECT value FROM json_each(?)))`;

export async function isDeveloper(
  db: D1Database,
  env: Pick<Env, 'DEVELOPER_EMAILS'>,
  userId: string,
) {
  const emails = developerEmails(env);
  if (!emails.length) return false;
  const row = await db
    .prepare(
      'SELECT 1 AS ok FROM users WHERE id=? AND lower(email) IN(SELECT value FROM json_each(?))',
    )
    .bind(userId, JSON.stringify(emails))
    .first<{ ok: number }>();
  return !!row;
}

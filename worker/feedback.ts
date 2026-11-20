import { z } from 'zod';
import {
  feedbackForm,
  feedbackLabels,
  type FeedbackContext,
  type FeedbackKind,
} from '../shared/feedback';
import { body, HttpError, json, type Actor, type Env } from './security';

export async function feedbackReady(db: D1Database) {
  const schema = await db
    .prepare(
      "SELECT COUNT(*) AS n FROM sqlite_schema WHERE type='table' AND name IN ('feedback_messages','feedback_contact_profiles')",
    )
    .first<{ n: number }>();
  return schema?.n === 2;
}
type Message = {
  id: string;
  author_id: string;
  kind: FeedbackKind;
  message: string;
  context: string | null;
  created_at: string;
  read_at: string | null;
  version: number;
  mutation_id: string;
};
const pageSize = 30;
const columns =
  'f.id,f.author_id,f.kind,f.message,f.context,f.created_at,f.read_at,f.version,f.mutation_id';
const validPhone = (phone: string | undefined) =>
  /^\d{12,13}$/.test(phone ?? '');
const reply = (phone: string, text: string) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
function publicMessage(row: Message) {
  return {
    id: row.id,
    kind: row.kind,
    message: row.message,
    created_at: row.created_at,
    read_at: row.read_at,
    version: row.version,
    context: row.context ? (JSON.parse(row.context) as FeedbackContext) : null,
  };
}
function nonce(req: Request) {
  const key = req.headers.get('Idempotency-Key');
  if (!z.uuid().safeParse(key).success)
    throw new HttpError(400, 'Chave de envio inválida.');
  return key!;
}

export async function feedback(req: Request, env: Env, actor: Actor) {
  const db = env.DB!,
    org = actor.organization_id,
    user = actor.user_id;
  const url = new URL(req.url);
  const part = url.pathname.split('/').slice(3);
  const inbox = part.length === 1 && part[0] === 'inbox';
  const reading = part.length === 2 && part[1] === 'read';
  if ((inbox || reading) && actor.role !== 'owner')
    throw new HttpError(
      403,
      'Somente o administrador acessa mensagens recebidas.',
    );
  if (!(await feedbackReady(db)))
    throw new HttpError(404, 'Canal indisponível.');

  if (part.length === 1 && part[0] === 'phone') {
    if (req.method === 'PUT') {
      const { phone } = await body(
        req,
        z
          .object({
            phone: z.string().regex(/^(?:55[1-9]\d{9,10})?$/),
          })
          .strict(),
      );
      if (phone)
        await db
          .prepare(
            'INSERT INTO feedback_contact_profiles(organization_id,user_id,phone) VALUES(?,?,?) ON CONFLICT(organization_id,user_id) DO UPDATE SET phone=excluded.phone',
          )
          .bind(org, user, phone)
          .run();
      else
        await db
          .prepare(
            'DELETE FROM feedback_contact_profiles WHERE organization_id=? AND user_id=?',
          )
          .bind(org, user)
          .run();
      return json({ phone });
    }
    if (req.method === 'GET') {
      const row = await db
        .prepare(
          'SELECT phone FROM feedback_contact_profiles WHERE organization_id=? AND user_id=?',
        )
        .bind(org, user)
        .first<{ phone: string }>();
      return json({ phone: row?.phone ?? '' });
    }
  }

  if (inbox && req.method === 'GET' && url.searchParams.get('count') === '1') {
    const row = await db
      .prepare(
        'SELECT COUNT(*) n FROM feedback_messages WHERE organization_id=? AND read_at IS NULL',
      )
      .bind(org)
      .first<{ n: number }>();
    return json({ unread: row?.n ?? 0 });
  }
  if ((inbox || !part.length) && req.method === 'GET') {
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(300000)
      .parse(url.searchParams.get('offset') ?? 0);
    if (inbox) {
      const unread = url.searchParams.get('filter') !== 'all';
      const [list, count] = await Promise.all([
        db
          .prepare(
            `SELECT ${columns},COALESCE(p.display_name,CASE WHEN m.role='owner' THEN 'Administrador' WHEN m.role='operator' THEN 'Operadora' ELSE 'Perfil desativado' END) author,
          c.phone FROM feedback_messages f LEFT JOIN memberships m ON m.organization_id=f.organization_id AND m.user_id=f.author_id
          LEFT JOIN display_profiles p ON p.organization_id=f.organization_id AND p.id=f.author_id
          LEFT JOIN feedback_contact_profiles c ON c.organization_id=f.organization_id AND c.user_id=f.author_id
          WHERE f.organization_id=? ${unread ? 'AND f.read_at IS NULL' : ''} ORDER BY f.created_at DESC,f.id DESC LIMIT ? OFFSET ?`,
          )
          .bind(org, pageSize + 1, offset)
          .all<Message & { author: string; phone: string | null }>(),
        db
          .prepare(
            'SELECT COUNT(*) n FROM feedback_messages WHERE organization_id=? AND read_at IS NULL',
          )
          .bind(org)
          .first<{ n: number }>(),
      ]);
      return json({
        unread: count?.n ?? 0,
        next: list.results.length > pageSize ? offset + pageSize : null,
        messages: list.results.slice(0, pageSize).map((row) => ({
          ...publicMessage(row),
          author: row.author,
          reply_url: validPhone(row.phone ?? undefined)
            ? reply(
                row.phone!,
                'Olá! Estou retornando sobre sua mensagem no app da Brigaderia Amor Zeloso.',
              )
            : null,
        })),
      });
    }
    const list = (
      await db
        .prepare(
          `SELECT ${columns} FROM feedback_messages f WHERE f.organization_id=? AND f.author_id=? ORDER BY f.created_at DESC,f.id DESC LIMIT ? OFFSET ?`,
        )
        .bind(org, user, pageSize + 1, offset)
        .all<Message>()
    ).results;
    return json({
      messages: list.slice(0, pageSize).map(publicMessage),
      next: list.length > pageSize ? offset + pageSize : null,
    });
  }

  if (!part.length && req.method === 'POST') {
    const id = nonce(req);
    const value = await body(req, feedbackForm, 12000);
    const context = value.context ? JSON.stringify(value.context) : null;
    const now = new Date(),
      cutoff = new Date(now.getTime() - 3600000).toISOString();
    await db
      .prepare(
        `INSERT INTO feedback_messages(organization_id,id,author_id,kind,message,context,created_at)
      SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM feedback_messages WHERE organization_id=? AND author_id=? AND created_at>=?)<10
      ON CONFLICT(organization_id,id) DO NOTHING`,
      )
      .bind(
        org,
        id,
        user,
        value.kind,
        value.message,
        context,
        now.toISOString(),
        org,
        user,
        cutoff,
      )
      .run();
    const stored = await db
      .prepare(
        `SELECT ${columns} FROM feedback_messages f WHERE f.organization_id=? AND f.id=?`,
      )
      .bind(org, id)
      .first<Message>();
    if (!stored)
      throw new HttpError(
        429,
        'Muitas mensagens nesta hora. Tente mais tarde.',
      );
    if (
      stored.author_id !== user ||
      stored.kind !== value.kind ||
      stored.message !== value.message ||
      stored.context !== context
    )
      throw new HttpError(
        409,
        'Esta chave já foi usada. Confira suas mensagens.',
      );
    const phone = env.FEEDBACK_WHATSAPP;
    return json(
      {
        ...publicMessage(stored),
        whatsapp_url: validPhone(phone)
          ? reply(
              phone!,
              `${feedbackLabels[stored.kind]} no app:\n${stored.message}`,
            )
          : null,
      },
      201,
    );
  }

  if (reading && req.method === 'POST') {
    const id = z.uuid().parse(part[0]),
      key = nonce(req);
    const { version } = await body(
      req,
      z.object({ version: z.number().int().positive() }).strict(),
    );
    await db
      .prepare(
        'UPDATE feedback_messages SET read_at=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=? AND read_at IS NULL',
      )
      .bind(new Date().toISOString(), key, org, id, version)
      .run();
    const stored = await db
      .prepare(
        `SELECT ${columns} FROM feedback_messages f WHERE f.organization_id=? AND f.id=?`,
      )
      .bind(org, id)
      .first<Message>();
    if (!stored) throw new HttpError(404, 'Mensagem não encontrada.');
    if (!stored.read_at)
      throw new HttpError(409, 'A mensagem mudou. Atualize a lista.');
    return json(publicMessage(stored));
  }
  throw new HttpError(404, 'Não encontrado.');
}

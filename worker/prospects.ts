import { emptyProfile } from '../shared/finance';
import { z } from 'zod';
import { type Actor, type Env, HttpError, json } from './security';
import { customerSchema } from './schemas';
import { noPhone } from '../shared/phone';
import { prospectStages, type ProspectData } from '../shared/prospects';
import { p1Mutation } from './p1-common';
import { fieldReady } from './field-ready';

export async function prospectsSchema(db: D1Database) {
  const r = await db
    .prepare(
      "SELECT (SELECT COUNT(*) FROM pragma_table_info('customers') WHERE name='kind')+(SELECT COUNT(*) FROM sqlite_schema WHERE type='table' AND name IN ('prospect_details','prospect_events')) AS n",
    )
    .first<{ n: number }>();
  return r?.n === 3;
}
export const prospectsReady = async (env: Env) =>
  env.PROSPECTS_ENABLED === 'true' &&
  !!env.DB &&
  (await prospectsSchema(env.DB));
export function requireCustomer(row: { kind?: unknown } | null) {
  if (row?.kind === 'prospect')
    throw new HttpError(
      400,
      'Converta o contato em cliente antes de criar pedidos ou pedidos padrão.',
    );
}
const text = (n: number) => z.string().trim().max(n);
const next = z
  .union([
    z.iso
      .datetime({ offset: true })
      .transform((v) => new Date(v).toISOString()),
    z.literal(''),
  ])
  .default('');
export const prospectInput = z
  .object({
    contact_person: text(120).default(''),
    source: text(200).default(''),
    stage: z.enum(prospectStages).default('to_visit'),
    next_step_at: next,
    reason: text(500).default(''),
    converted_at: z.literal('').optional(),
  })
  .strict();
const editInput = customerSchema.extend({ prospect: prospectInput });
export async function prospects(req: Request, env: Env, a: Actor) {
  if (!(await prospectsReady(env))) throw new HttpError(404, 'Não encontrado.');
  const db = env.DB!,
    org = a.organization_id;
  const [, , , id, action, extra] = new URL(req.url).pathname.split('/');
  if (extra || (action && !id) || (id && !z.uuid().safeParse(id).success))
    throw new HttpError(404, 'Não encontrado.');
  const row = id
    ? await db
        .prepare(
          'SELECT c.*,p.data AS prospect_data FROM customers c JOIN prospect_details p ON p.organization_id=c.organization_id AND p.customer_id=c.id WHERE c.organization_id=? AND c.id=?',
        )
        .bind(org, id)
        .first<Record<string, unknown>>()
    : null;
  if (id && !row) throw new HttpError(404, 'Não encontrado.');
  if (id && !action && req.method === 'GET') {
    const events = (
      await db
        .prepare(
          'SELECT id,user_id,from_stage,to_stage,next_step_at,reason,created_at FROM prospect_events WHERE organization_id=? AND customer_id=? ORDER BY created_at DESC,id DESC LIMIT 50',
        )
        .bind(org, id)
        .all()
    ).results;
    return json({
      id,
      version: row!.version,
      kind: row!.kind,
      data: JSON.parse(String(row!.prospect_data)),
      events,
    });
  }
  if (!(
    (req.method === 'POST' && (!id || ['stage', 'convert'].includes(action))) ||
    (req.method === 'PUT' && id && !action)
  ))
    throw new HttpError(405, 'Método não permitido.');
  return p1Mutation(req, db, a, async (raw, nonce) => {
    // Relê antes do CAS; o guard vincula todas as escritas à mesma entidade/organização.
    const current = id
      ? await db
          .prepare(
            'SELECT c.*,p.data AS prospect_data FROM customers c JOIN prospect_details p ON p.organization_id=c.organization_id AND p.customer_id=c.id WHERE c.organization_id=? AND c.id=?',
          )
          .bind(org, id)
          .first<Record<string, unknown>>()
      : null;
    if (id && !current) throw new HttpError(404, 'Não encontrado.');
    if (current && (current.kind !== 'prospect' || (action && !current.active)))
      throw new HttpError(409, 'Contato convertido ou arquivado. Atualize.');
    const prior = current
      ? (JSON.parse(String(current.prospect_data)) as ProspectData)
      : null;
    let data: ProspectData, version: number, first: D1PreparedStatement;
    const entity = id ?? crypto.randomUUID();
    const rest: D1PreparedStatement[] = [];
    if (action) {
      const d =
        action === 'convert'
          ? z
              .object({ version: z.number().int().positive() })
              .strict()
              .parse(raw)
          : z
              .object({
                version: z.number().int().positive(),
                stage: z.enum(prospectStages),
                next_step_at: next,
                reason: text(500).default(''),
              })
              .strict()
              .parse(raw);
      version = d.version;
      data =
        action === 'convert'
          ? {
              ...prior!,
              stage: 'converted',
              converted_at: new Date().toISOString(),
              next_step_at: '',
            }
          : ({ ...prior!, ...d, converted_at: '' } as ProspectData);
      // Versão não faz parte do JSON de detalhes.
      data = {
        contact_person: data.contact_person,
        source: data.source,
        stage: data.stage,
        next_step_at: data.next_step_at,
        reason: data.reason,
        converted_at: data.converted_at,
      };
      first = db
        .prepare(
          "UPDATE customers SET kind=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=? AND kind='prospect' AND active=1",
        )
        .bind(
          action === 'convert' ? 'customer' : 'prospect',
          nonce,
          org,
          entity,
          version,
        );
    } else {
      const d = editInput.parse(raw);
      version = current ? (d.version ?? 0) : 0;
      if (current && !version)
        throw new HttpError(400, 'Informe a versão do contato.');
      if (
        d.site &&
        (!(await fieldReady(env)) || (!current && d.site.version !== 0))
      )
        throw new HttpError(
          400,
          'Localização indisponível ou versão inválida.',
        );
      data = { ...d.prospect, converted_at: '' };
      first = current
        ? db
            .prepare(
              "UPDATE customers SET name=?,phone=?,email=?,notes=?,active=?,customer_type=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=? AND kind='prospect'" +
                (d.site
                  ? ' AND COALESCE((SELECT version FROM customer_sites WHERE organization_id=? AND id=?),0)=?'
                  : ''),
            )
            .bind(
              d.name,
              d.phone || noPhone(entity),
              d.email,
              d.notes,
              +d.active,
              d.customer_type ?? String(current.customer_type),
              nonce,
              org,
              entity,
              version,
              ...(d.site ? [org, entity, d.site.version] : []),
            )
        : db
            .prepare(
              "INSERT INTO customers(organization_id,id,name,phone,email,notes,active,kind,customer_type,mutation_id) VALUES(?,?,?,?,?,?,?,'prospect',?,?)",
            )
            .bind(
              org,
              entity,
              d.name,
              d.phone || noPhone(entity),
              d.email,
              d.notes,
              +d.active,
              d.customer_type ?? 'establishment',
              nonce,
            );
      if (d.site)
        rest.push(
          db
            .prepare(
              'INSERT INTO customer_sites(organization_id,id,data,version,mutation_id) SELECT ?,?,?,1,? WHERE EXISTS(SELECT 1 FROM customers WHERE organization_id=? AND id=? AND mutation_id=?) ON CONFLICT(organization_id,id) DO UPDATE SET data=excluded.data,version=customer_sites.version+1,mutation_id=excluded.mutation_id',
            )
            .bind(
              org,
              entity,
              JSON.stringify(d.site.data),
              nonce,
              org,
              entity,
              nonce,
            ),
        );
    }
    if (action === 'convert') {
      // Reaproveita os nomes informados, sem definir condições ou criar movimentos.
      // Um perfil previamente configurado nunca é sobrescrito.
      rest.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO customer_profiles(organization_id,customer_id,data) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM customers WHERE organization_id=? AND id=? AND mutation_id=?)`,
          )
          .bind(
            org,
            entity,
            JSON.stringify({
              ...emptyProfile(),
              establishment: String(current!.name),
              responsible: prior!.contact_person,
            }),
            org,
            entity,
            nonce,
          ),
      );
    }
    return {
      table: 'customers',
      id: entity,
      action: 'prospect.' + (action ?? (id ? 'edit' : 'create')),
      response: {
        id: entity,
        version: version + 1,
        kind: action === 'convert' ? 'customer' : 'prospect',
      },
      first,
      rest: (guard, args) => [
        ...rest,
        db
          .prepare(
            `INSERT INTO prospect_details(organization_id,customer_id,data) SELECT ?,?,? WHERE ${guard} ON CONFLICT(organization_id,customer_id) DO UPDATE SET data=excluded.data`,
          )
          .bind(org, entity, JSON.stringify(data), ...args),
        db
          .prepare(
            `INSERT INTO prospect_events(organization_id,id,customer_id,user_id,from_stage,to_stage,next_step_at,reason) SELECT ?,?,?,?,?,?,?,? WHERE ${guard}`,
          )
          .bind(
            org,
            crypto.randomUUID(),
            entity,
            a.user_id,
            prior?.stage ?? '',
            data.stage,
            data.next_step_at,
            data.reason,
            ...args,
          ),
      ],
    };
  });
}

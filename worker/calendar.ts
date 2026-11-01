import { z } from 'zod';
import { addDays, utcStart } from './operations-domain';
import { closingPeriod, type B2BProfile } from '../shared/finance';
import { HttpError, json, type Actor } from './security';
import { requestRange, fileResponse } from './p1-common';
import { receivables } from './receivables';
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  at?: string;
  kind: 'delivery' | 'production' | 'closing' | 'due' | 'reminder';
  href: string;
}
const escapeICS = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
export function foldICS(line: string) {
  const encoder = new TextEncoder();
  let current = '';
  const lines: string[] = [];
  for (const c of line) {
    if (encoder.encode(current + c).length > 75) {
      lines.push(current);
      current = ' ' + c;
    } else current += c;
  }
  lines.push(current);
  return lines.join('\r\n');
}
export function toICS(events: CalendarEvent[]) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Amor Zeloso//Gestao//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const e of events) {
    const start = e.at
      ? new Date(e.at)
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d{3}Z$/, 'Z')
      : e.date.replaceAll('-', '');
    lines.push(
      'BEGIN:VEVENT',
      'UID:' + escapeICS(e.id + '@amor-zeloso.local'),
      'DTSTAMP:' +
        new Date()
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d{3}Z$/, 'Z'),
      (e.at ? 'DTSTART:' : 'DTSTART;VALUE=DATE:') + start,
      ...(!e.at
        ? ['DTEND;VALUE=DATE:' + addDays(e.date, 1).replaceAll('-', '')]
        : []),
      'SUMMARY:' + escapeICS(e.title),
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldICS).join('\r\n') + '\r\n';
}
export async function calendar(req: Request, db: D1Database, a: Actor) {
  const { from, to } = requestRange(req, 44),
    org = a.organization_id,
    events: CalendarEvent[] = [];
  const orders = (
    await db
      .prepare(
        "SELECT id,customer_name,due_at,status FROM orders WHERE organization_id=? AND active=1 AND status<>'cancelled' AND due_at>=? AND due_at<? ORDER BY due_at,id LIMIT 1001",
      )
      .bind(org, utcStart(from), utcStart(addDays(to, 1)))
      .all<{
        id: string;
        customer_name: string;
        due_at: string;
        status: string;
      }>()
  ).results;
  if (orders.length > 1000)
    throw new HttpError(409, 'Agenda excede 1000 pedidos; reduza o período.');
  for (const o of orders) {
    const date = new Date(Date.parse(o.due_at) - 10800000)
      .toISOString()
      .slice(0, 10);
    events.push({
      id: 'delivery-' + o.id,
      title: 'Pedido/entrega · ' + o.customer_name,
      date,
      at: o.due_at,
      kind: 'delivery',
      href: '/gestao/pedidos/' + o.id,
    });
    if (['confirmed', 'in_production'].includes(o.status))
      events.push({
        id: 'production-' + o.id,
        title: 'Produção planejada para o prazo · ' + o.customer_name,
        date,
        kind: 'production',
        href: '/gestao/pedidos/' + o.id,
      });
  }
  const profiles = (
    await db
      .prepare(
        "SELECT p.customer_id,p.data,c.name FROM customer_profiles p JOIN customers c ON c.organization_id=p.organization_id AND c.id=p.customer_id WHERE p.organization_id=? AND c.active=1 AND p.payment_mode='credit' LIMIT 201",
      )
      .bind(org)
      .all<{ customer_id: string; data: string; name: string }>()
  ).results;
  if (profiles.length > 200)
    throw new HttpError(409, 'Agenda excede 200 calendários de clientes.');
  for (const p of profiles) {
    const terms = (JSON.parse(p.data) as B2BProfile).terms;
    for (let day = from; day <= to; day = addDays(day, 1)) {
      const period = closingPeriod(day, terms);
      if (period.end === day)
        events.push({
          id: 'closing-plan-' + p.customer_id + '-' + day,
          title: 'Fechar período · ' + p.name,
          date: day,
          kind: 'closing',
          href: '/gestao/financeiro/' + p.customer_id,
        });
    }
  }
  const closed = (
    await db
      .prepare(
        "SELECT id,customer_id,period_end FROM closings WHERE organization_id=? AND status='active' AND period_end>=? AND period_end<=? LIMIT 1001",
      )
      .bind(org, from, to)
      .all<{ id: string; customer_id: string; period_end: string }>()
  ).results;
  if (closed.length > 1000)
    throw new HttpError(409, 'Mais de 1000 fechamentos no período.');
  for (const c of closed)
    events.push({
      id: 'closing-' + c.id,
      title: 'Fechamento registrado · ' + c.id.slice(0, 8),
      date: c.period_end,
      kind: 'closing',
      href: '/gestao/financeiro/' + c.customer_id,
    });
  const dueGroups = new Map<string, CalendarEvent>();
  for (const o of await receivables(db, org)) {
    if (o.balance_cents && o.due_on && o.due_on >= from && o.due_on <= to) {
      const id = 'due-' + (o.closing_id || o.id);
      dueGroups.set(id, {
        id,
        title: 'Vencimento · ' + o.customer_name,
        date: o.due_on,
        kind: 'due',
        href: '/gestao/financeiro/' + o.customer_id,
      });
    }
  }
  events.push(...dueGroups.values());
  const reminders = (
    await db
      .prepare(
        'SELECT id,title,due_at FROM reminders WHERE organization_id=? AND active=1 AND done=0 AND due_at>=? AND due_at<? LIMIT 501',
      )
      .bind(org, utcStart(from), utcStart(addDays(to, 1)))
      .all<{ id: string; title: string; due_at: string }>()
  ).results;
  if (reminders.length > 500)
    throw new HttpError(409, 'Mais de 500 lembretes no período.');
  for (const r of reminders)
    events.push({
      id: 'reminder-' + r.id,
      title: 'Lembrete · ' + r.title,
      date: new Date(Date.parse(r.due_at) - 10800000)
        .toISOString()
        .slice(0, 10),
      at: r.due_at,
      kind: 'reminder',
      href: '/gestao/lembretes',
    });
  events.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      String(a.at || '').localeCompare(String(b.at || '')) ||
      a.id.localeCompare(b.id),
  );
  const kind = new URL(req.url).searchParams.get('kind');
  if (
    kind &&
    !z
      .enum(['delivery', 'production', 'closing', 'due', 'reminder'])
      .safeParse(kind).success
  )
    throw new HttpError(400, 'Tipo inválido.');
  const selected = kind ? events.filter((e) => e.kind === kind) : events;
  return new URL(req.url).pathname.endsWith('.ics')
    ? fileResponse(
        toICS(selected),
        'text/calendar; charset=utf-8',
        'agenda-amor-zeloso.ics',
      )
    : json({ from, to, events: selected, timezone: 'America/Fortaleza' });
}

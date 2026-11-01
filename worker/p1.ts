import { toolsReady } from './tools-ready';
import { inventory } from './inventory';
import { recipes } from './recipes';
import { expenses } from './expenses';
import { reports } from './reports';
import { reminders } from './reminders';
import { p1Ready } from './p1-ready';
import { calendar } from './calendar';
import { HttpError, type Env, type Actor } from './security';
export async function p1(req: Request, env: Env, a: Actor) {
  if (!(await p1Ready(env)))
    throw new HttpError(503, 'Módulos P1 ainda não ativados.');
  const [, , , resource, id] = new URL(req.url).pathname.split('/');
  if (resource === 'inventory') {
    if (!(await toolsReady(env)))
      throw new HttpError(503, 'Estoque ainda não ativado.');
    return inventory(req, env.DB!, a, id);
  }
  if (['reports', 'reports.csv'].includes(resource) && req.method === 'GET')
    return reports(req, env.DB!, a);
  if (['expenses', 'cashflow', 'cashflow.csv'].includes(resource))
    return expenses(req, env.DB!, a, resource, id);
  if (['supplies', 'recipes', 'shopping'].includes(resource))
    return recipes(req, env.DB!, a, resource, id);
  if (resource === 'reminders') return reminders(req, env.DB!, a, id);
  if (['calendar', 'calendar.ics'].includes(resource) && req.method === 'GET')
    return calendar(req, env.DB!, a);
  throw new HttpError(404, 'Não encontrado.');
}

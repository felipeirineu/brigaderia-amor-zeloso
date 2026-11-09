// Entrada exclusiva de testes para disparar o mesmo agendador em workerd/D1 local.
import app from '../../worker/pages';
import scheduler from '../../worker/push-scheduler';
export default { fetch: app.fetch, scheduled: scheduler.scheduled };

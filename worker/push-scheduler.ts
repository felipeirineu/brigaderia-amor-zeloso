import { processPushJobs } from './push-delivery';
import type { Env } from './security';
/** Worker separado: Pages não oferece Cron Trigger. Ativação somente pelo responsável. */
export default {
  async scheduled(controller: ScheduledController, env: Env) {
    await processPushJobs(env, undefined, new Date(controller.scheduledTime));
  },
  fetch() {
    return new Response('Not found', { status: 404 });
  },
};

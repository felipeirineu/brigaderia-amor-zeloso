import { processPushJobs } from './push-delivery';
import type { Env } from './security';
import { schemaCacheSeconds, withSchemaCache } from './schema-cache';
/** Worker separado: Pages não oferece Cron Trigger. Ativação somente pelo responsável. */
export default {
  async scheduled(controller: ScheduledController, env: Env) {
    await processPushJobs(
      { ...env, DB: withSchemaCache(env.DB, schemaCacheSeconds(env)) },
      undefined,
      new Date(controller.scheduledTime),
    );
  },
  fetch() {
    return new Response('Not found', { status: 404 });
  },
};

import api, { type Env } from '../../worker/index';

// Só o harness local usa loopback sem a validação do hostname do Pages.
export default {
  fetch(request: Request, env: Env & { ASSETS: Fetcher }) {
    return new URL(request.url).pathname.startsWith('/api/')
      ? api.fetch(request, env)
      : env.ASSETS.fetch(request);
  },
};

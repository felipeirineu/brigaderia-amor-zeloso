import { execFileSync } from 'node:child_process';
import { readFile, stat, readlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { expect, it, vi } from 'vitest';
import { importJWK, SignJWT, jwtVerify } from 'jose';
import {
  runPushActivation,
  main,
  parseApplicationConfig,
  temporaryScheduler,
  cloudflareReader,
  wrangler,
  vapidNames,
  workerName,
  expectedCron,
  maskSecret,
} from './run-push-activation.mjs';
import { generatePushKeys } from './push-keys.mjs';
vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));
const config = `{
 // Apenas demonstração; o parser deve aceitar JSONC e vírgulas finais.
 "name":"app-demonstracao", "pages_build_output_dir":"dist", "compatibility_date":"2026-10-30",
 "d1_databases":[{"binding":"DB","database_name":"banco-demonstracao","database_id":"00000000-0000-0000-0000-000000000001",},],
}`;
const values = () =>
  Object.fromEntries(
    vapidNames.map((n) => [
      n,
      n === 'VAPID_SUBJECT'
        ? 'https://app.example.test/'
        : 'ficticio-' + crypto.randomUUID(),
    ]),
  );
function fixture({
  mode = 'VERIFICAR',
  pages = {},
  worker = null,
  cron = false,
} = {}) {
  const env = {
    GITHUB_ACTIONS: 'true',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    PUSH_ACTIVATION_MODE: mode,
    PUSH_ACTIVATION_CONFIRM: 'true',
    CLOUDFLARE_ACCOUNT_ID: '0'.repeat(32),
    CLOUDFLARE_API_TOKEN: 'ficticio-' + crypto.randomUUID(),
    APP_URL: 'https://app.example.test/',
  };
  const state = { pages: { ...pages }, worker: worker && { ...worker }, cron };
  const output = [],
    masks = [],
    calls = [],
    temps = [];
  const secrets = (entries) =>
    Object.fromEntries(
      Object.entries(entries).map(([n, value]) => [
        n,
        { type: 'secret_text', value },
      ]),
    );
  const fetcher = vi.fn(async (url, options) => {
    expect(options.method).toBe('GET');
    expect(options.redirect).toBe('error');
    expect(options.headers.Authorization).toBe(
      'Bearer ' + env.CLOUDFLARE_API_TOKEN,
    );
    const path = new URL(url).pathname.split(
      '/accounts/' + env.CLOUDFLARE_ACCOUNT_ID,
    )[1];
    let result;
    if (path === '/pages/projects/app-demonstracao')
      result = {
        deployment_configs: {
          production: { env_vars: secrets(state.pages) },
          preview: { env_vars: secrets({ PREVIEW_ONLY: 'ficticio' }) },
        },
      };
    else if (path === '/workers/scripts')
      result = state.worker ? [{ id: workerName }] : [];
    else if (path === '/workers/scripts/' + workerName + '/settings') {
      if (!state.worker)
        return Response.json(
          { success: false, errors: [{ code: 10007 }] },
          { status: 404 },
        );
      result = {
        bindings: [
          { name: 'DB', type: 'd1' },
          ...Object.entries(secrets(state.worker)).map(([name, binding]) => ({
            name,
            ...binding,
          })),
        ],
      };
    } else if (path === '/workers/scripts/' + workerName + '/secrets')
      result = Object.keys(state.worker).map((name) => ({
        name,
        type: 'secret_text',
      }));
    else if (path === '/workers/scripts/' + workerName + '/schedules')
      result = { schedules: state.cron ? [{ cron: expectedCron }] : [] };
    else throw Error('Endpoint inesperado no teste: ' + path);
    return Response.json({ success: true, result });
  });
  const keys = values();
  const io = {
    fetcher,
    readConfig: vi.fn(async () => config),
    generateKeys: vi.fn(async () => keys),
    log: (message) => output.push(message),
    error: (message) => output.push(message),
    // Simula o canal de comandos do runner separadamente do log humano.
    mask: (value) => masks.push(value),
    temporary: vi.fn(async (c, e) => {
      const tmp = await temporaryScheduler(c, e);
      temps.push(tmp);
      expect((await stat(dirname(tmp.path))).mode & 0o777).toBe(0o700);
      expect((await stat(tmp.path)).mode & 0o777).toBe(0o600);
      expect(await readlink(tmp.logPath)).toBe('/dev/null');
      expect(tmp.path.startsWith(resolve('.') + '/')).toBe(false);
      return tmp;
    }),
    wrangler: vi.fn(async (args, input, e, tmp) => {
      expect(e).toBe(env);
      const cfg = JSON.parse(await readFile(tmp.path, 'utf8'));
      expect(cfg.name).toBe(workerName);
      expect(cfg.triggers.crons).toEqual([expectedCron]);
      expect(cfg.d1_databases).toEqual([
        parseApplicationConfig(config).database,
      ]);
      expect(cfg.account_id).toBe(env.CLOUDFLARE_ACCOUNT_ID);
      expect(cfg.keep_vars).toBe(true);
      expect(cfg.workers_dev).toBe(false);
      expect(cfg.preview_urls).toBe(false);
      expect(cfg.main).toBe(resolve('worker/push-scheduler.ts'));
      const text = JSON.stringify(cfg);
      for (const k of Object.values(keys)) expect(text).not.toContain(k);
      calls.push({ args, input });
      if (args[0] === 'secret')
        state.worker = { ...state.worker, ...JSON.parse(input) };
      else if (args[0] === 'pages')
        state.pages = { ...state.pages, ...JSON.parse(input) };
      else if (args[0] === 'deploy') {
        expect(input).toBeUndefined();
        expect(args).toContain('--keep-vars');
        state.cron = true;
      } else throw Error('Comando inesperado no teste');
      // Mesmo que o filho devolva saída sensível, ela nunca deve ser impressa.
      return 'não imprimir: ' + keys.VAPID_PRIVATE_KEY;
    }),
  };
  return { env, io, state, keys, output, masks, calls, temps };
}
const noWrites = (f) => {
  expect(f.io.wrangler).not.toHaveBeenCalled();
  expect(f.io.generateKeys).not.toHaveBeenCalled();
  expect(f.io.temporary).not.toHaveBeenCalled();
};

it('VERIFICAR só lê e lista nomes de produção, sem valores ou mudanças', async () => {
  const f = fixture({
    pages: { ACCESS_DEMO: 'nunca-imprimir-' + crypto.randomUUID() },
  });
  const before = JSON.stringify(f.state);
  const r = await runPushActivation(f.env, f.io);
  expect(r.worker_exists).toBe(false);
  expect(r.cron_exists).toBe(false);
  expect(JSON.stringify(f.state)).toBe(before);
  noWrites(f);
  expect(f.output.join('\n')).toContain('ACCESS_DEMO');
  expect(f.output.join('\n')).not.toContain(f.state.pages.ACCESS_DEMO);
  expect(f.output.join('\n')).not.toContain('PREVIEW_ONLY');
  expect(f.output.join('\n')).not.toContain(f.env.CLOUDFLARE_API_TOKEN);
});
it('VERIFICAR reconhece cron e trio completo sem republicar', async () => {
  const trio = values(),
    f = fixture({ pages: trio, worker: trio, cron: true });
  const r = await runPushActivation(f.env, f.io);
  expect(r.complete && r.worker_exists && r.cron_exists).toBe(true);
  noWrites(f);
  expect(f.output.join('\n')).toContain('republicar Pages');
  for (const value of Object.values(trio))
    expect(f.output.join('\n')).not.toContain(value);
});
it.each(['ATIVAR', 'REPUBLICAR_AGENDADOR'])(
  'recusa %s sem confirmação antes de ler a conta',
  async (mode) => {
    const f = fixture({ mode });
    f.env.PUSH_ACTIVATION_CONFIRM = 'false';
    await expect(runPushActivation(f.env, f.io)).rejects.toThrow(/confirmação/);
    noWrites(f);
    expect(f.io.fetcher).not.toHaveBeenCalled();
  },
);
it.each([
  { GITHUB_ACTIONS: 'false' },
  { GITHUB_REF: 'refs/heads/codex/demo' },
  { GITHUB_EVENT_NAME: 'push' },
  { PUSH_ACTIVATION_MODE: 'OUTRO' },
  { CLOUDFLARE_API_TOKEN: '' },
  { CLOUDFLARE_ACCOUNT_ID: '' },
  { APP_URL: 'mailto:owner@example.test' },
  { APP_URL: 'http://app.example.test' },
  { APP_URL: 'https://nome:senha@app.example.test/' },
  { APP_URL: 'https://app.example.test/?segredo=demo' },
])('recusa entradas inválidas sem rede: %j', async (override) => {
  const f = fixture();
  Object.assign(f.env, override);
  expect(await main(f.env, f.io)).toBe(1);
  noWrites(f);
  expect(f.io.fetcher).not.toHaveBeenCalled();
});
it.each(['pages', 'worker'])(
  'ATIVAR não substitui identidade no destino %s',
  async (where) => {
    const f = fixture({
      mode: 'ATIVAR',
      [where]: { VAPID_PUBLIC_KEY: 'ficticio-' + crypto.randomUUID() },
    });
    await expect(runPushActivation(f.env, f.io)).rejects.toThrow(/já existe/);
    noWrites(f);
  },
);
it.each(vapidNames)(
  'recusa também configuração parcial existente: %s',
  async (name) => {
    const f = fixture({ mode: 'ATIVAR', pages: { [name]: 'ficticio' } });
    await expect(runPushActivation(f.env, f.io)).rejects.toThrow(/já existe/);
    noWrites(f);
  },
);
it('ATIVAR envia o mesmo trio por stdin, mascara antes de escrever e limpa o temporário', async () => {
  const f = fixture({ mode: 'ATIVAR' });
  const execute = f.io.wrangler;
  f.io.wrangler = vi.fn(async (...args) => {
    for (const value of Object.values(f.keys)) expect(f.masks).toContain(value);
    return execute(...args);
  });
  const r = await runPushActivation(f.env, f.io);
  expect(r.complete && r.cron_exists).toBe(true);
  expect(f.io.generateKeys).toHaveBeenCalledExactlyOnceWith(f.env.APP_URL);
  expect(f.calls).toHaveLength(3);
  expect(f.calls.map((c) => c.args.slice(0, 2))).toEqual([
    ['secret', 'bulk'],
    ['pages', 'secret'],
    ['deploy', '--config'],
  ]);
  expect(f.calls[1].args).toEqual([
    'pages',
    'secret',
    'bulk',
    '--project-name',
    'app-demonstracao',
    '--env',
    'production',
  ]);
  expect(JSON.parse(f.calls[0].input)).toEqual(f.keys);
  expect(f.calls[1].input).toBe(f.calls[0].input);
  for (const value of Object.values(f.keys)) {
    expect(f.output.join('\n')).not.toContain(value);
    expect(JSON.stringify(f.calls.map((c) => c.args))).not.toContain(value);
  }
  await expect(stat(f.temps[0].path)).rejects.toMatchObject({ code: 'ENOENT' });
});
it('REPUBLICAR preserva secrets, não gera chaves e só executa deploy', async () => {
  const trio = values(),
    f = fixture({ mode: 'REPUBLICAR_AGENDADOR', pages: trio, worker: trio });
  const before = JSON.stringify([f.state.pages, f.state.worker]);
  await runPushActivation(f.env, f.io);
  expect(f.io.generateKeys).not.toHaveBeenCalled();
  expect(f.calls).toHaveLength(1);
  expect(f.calls[0].args[0]).toBe('deploy');
  expect(JSON.stringify([f.state.pages, f.state.worker])).toBe(before);
  await expect(stat(f.temps[0].path)).rejects.toMatchObject({ code: 'ENOENT' });
});
it('REPUBLICAR recusa agendador ou secrets ausentes, sem criar nova identidade', async () => {
  const f = fixture({ mode: 'REPUBLICAR_AGENDADOR' });
  await expect(runPushActivation(f.env, f.io)).rejects.toThrow(/exige/);
  noWrites(f);
});
it('falha parcial oculta saída/erros do Wrangler e impede nova ATIVAÇÃO', async () => {
  const f = fixture({ mode: 'ATIVAR' }),
    execute = f.io.wrangler;
  f.io.wrangler = vi.fn(async (...args) => {
    if (args[0][0] === 'pages')
      throw Object.assign(new Error(f.keys.VAPID_PRIVATE_KEY), {
        stdout: f.keys.VAPID_PUBLIC_KEY,
        stderr: f.env.CLOUDFLARE_API_TOKEN,
      });
    return execute(...args);
  });
  expect(await main(f.env, f.io)).toBe(1);
  expect(f.output.join('\n')).toContain('parcial');
  for (const value of [...Object.values(f.keys), f.env.CLOUDFLARE_API_TOKEN])
    expect(f.output.join('\n')).not.toContain(value);
  await expect(stat(f.temps[0].path)).rejects.toMatchObject({ code: 'ENOENT' });
  const generated = f.io.generateKeys.mock.calls.length,
    written = f.io.wrangler.mock.calls.length;
  await expect(runPushActivation(f.env, f.io)).rejects.toThrow(/já existe/);
  expect(f.io.generateKeys.mock.calls.length).toBe(generated);
  expect(f.io.wrangler.mock.calls.length).toBe(written);
});
it('post-verificação inconclusiva não declara sucesso nem repete publicação', async () => {
  const f = fixture({ mode: 'ATIVAR' }),
    execute = f.io.wrangler;
  f.io.wrangler = vi.fn(async (...args) => {
    await execute(...args);
    f.state.cron = false;
  });
  await expect(runPushActivation(f.env, f.io)).rejects.toThrow(/VERIFICAR/);
  expect(f.calls).toHaveLength(3);
  await expect(stat(f.temps[0].path)).rejects.toMatchObject({ code: 'ENOENT' });
});
it.each([403, 500, 404])(
  'HTTP %s não é interpretado como conta sem chaves e não vaza corpo',
  async (status) => {
    const f = fixture({ mode: 'ATIVAR' });
    f.io.fetcher = vi.fn(async () =>
      Response.json(
        {
          success: false,
          errors: [{ code: 999, message: f.keys.VAPID_PRIVATE_KEY }],
        },
        { status },
      ),
    );
    expect(await main(f.env, f.io)).toBe(1);
    noWrites(f);
    expect(f.output.join('\n')).not.toContain(f.keys.VAPID_PRIVATE_KEY);
  },
);
it('metadados incompletos ou nome hostil não liberam geração', async () => {
  for (const env_vars of [
    undefined,
    { 'NOME\n::warning::': { type: 'secret_text' } },
  ]) {
    const f = fixture({ mode: 'ATIVAR' });
    f.io.fetcher = vi.fn(async () =>
      Response.json({
        success: true,
        result: { deployment_configs: { production: { env_vars } } },
      }),
    );
    expect(await main(f.env, f.io)).toBe(1);
    noWrites(f);
    expect(f.output.join('\n')).not.toContain('::warning::');
  }
});
it('VAPID pública em variável não secreta também bloqueia sobrescrita', async () => {
  const f = fixture({ mode: 'ATIVAR' }),
    fetcher = f.io.fetcher;
  f.io.fetcher = vi.fn(async (url, options) => {
    if (url.includes('/pages/projects/'))
      return Response.json({
        success: true,
        result: {
          deployment_configs: {
            production: {
              env_vars: {
                VAPID_PUBLIC_KEY: {
                  type: 'plain_text',
                  value: f.keys.VAPID_PUBLIC_KEY,
                },
              },
            },
          },
        },
      });
    return fetcher(url, options);
  });
  await expect(runPushActivation(f.env, f.io)).rejects.toThrow(/já existe/);
  noWrites(f);
});
it('reader não segue redirects, não imprime falhas de rede e só tolera Worker ausente reconhecido', async () => {
  const f = fixture();
  const read = cloudflareReader(f.env, async () => {
    throw Error(f.env.CLOUDFLARE_API_TOKEN);
  });
  await expect(read('/workers/scripts')).rejects.not.toThrow(
    f.env.CLOUDFLARE_API_TOKEN,
  );
  const notFound = cloudflareReader(f.env, async () =>
    Response.json(
      { success: false, errors: [{ code: 10007 }] },
      { status: 404 },
    ),
  );
  expect(await notFound('/workers/scripts/demo/settings', true)).toBeNull();
  await expect(notFound('/workers/scripts/demo/settings')).rejects.toThrow(
    /Leitura/,
  );
});
it('JSONC mantém DB da aplicação e recusa binding ausente/ambíguo', () => {
  expect(parseApplicationConfig(config).project).toBe('app-demonstracao');
  expect(() => parseApplicationConfig('{}')).toThrow(/inválida/);
  expect(() =>
    parseApplicationConfig(
      config.replace('"binding":"DB"', '"binding":"OUTRO"'),
    ),
  ).toThrow(/inválida/);
});
it('gera P-256 compatível com o helper local e assina com o mesmo par', async () => {
  const keys = await generatePushKeys('https://app.example.test/');
  const bytes = Buffer.from(keys.VAPID_PUBLIC_KEY, 'base64url');
  expect(bytes.length).toBe(65);
  expect(bytes[0]).toBe(4);
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: bytes.subarray(1, 33).toString('base64url'),
    y: bytes.subarray(33).toString('base64url'),
  };
  const token = await new SignJWT({ demonstration: true })
    .setProtectedHeader({ alg: 'ES256' })
    .sign(await importJWK({ ...jwk, d: keys.VAPID_PRIVATE_KEY }, 'ES256'));
  expect(
    (await jwtVerify(token, await importJWK(jwk, 'ES256'))).payload
      .demonstration,
  ).toBe(true);
});
it('canal add-mask escapa quebras de linha, sem injetar comandos adicionais', () => {
  const write = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation(() => true);
  try {
    maskSecret('ficticio%\r\n::warning::');
    expect(write).toHaveBeenCalledWith(
      '::add-mask::ficticio%25%0D%0A::warning::\n',
    );
  } finally {
    write.mockRestore();
  }
});
it('workflow só manual/main, environment separado, confirmação e sem artefatos/segredos no shell', async () => {
  const yaml = await readFile('.github/workflows/push-activation.yml', 'utf8');
  expect(yaml).toMatch(/on:\n {2}workflow_dispatch:/);
  expect(yaml).not.toMatch(/^ {2}(push|pull_request|schedule):/m);
  expect(yaml).toContain("if: github.ref == 'refs/heads/main'");
  expect(yaml).toContain('environment: lembretes-push');
  expect(yaml).toContain('contents: read');
  expect(yaml).not.toContain('contents: write');
  expect(yaml).toContain('cancel-in-progress: false');
  expect(yaml).toMatch(/confirmo:[\s\S]*required: true[\s\S]*default: false/);
  expect(yaml).toContain('run: node scripts/run-push-activation.mjs');
  expect(yaml).toContain(
    'CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}',
  );
  expect(yaml).not.toMatch(/run:.*\$\{\{/);
  expect(yaml).not.toContain('upload-artifact@');
});

it('adapter Wrangler usa somente stdin/pipes, logs descartados e métricas desativadas', () => {
  const f = fixture();
  const child = vi.mocked(execFileSync);
  child.mockReturnValue('não imprimir-' + f.keys.VAPID_PRIVATE_KEY);
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  try {
    const input = JSON.stringify(f.keys),
      logPath = '/tmp/DEMONSTRACAO/wrangler.log';
    wrangler(
      ['secret', 'bulk', '--config', '/tmp/DEMONSTRACAO/wrangler.json'],
      input,
      f.env,
      { logPath },
    );
    const [executable, args, options] = child.mock.calls.at(-1);
    expect(executable).toBe(process.execPath);
    expect(args[0]).toBe(resolve('node_modules/wrangler/bin/wrangler.js'));
    expect(options.input).toBe(input);
    expect(options.stdio).toEqual(['pipe', 'pipe', 'pipe']);
    expect(options.env.WRANGLER_LOG_PATH).toBe(logPath);
    expect(options.env.WRANGLER_LOG_SANITIZE).toBe('true');
    expect(options.env.WRANGLER_SEND_METRICS).toBe('false');
    expect(options.env.CI).toBe('true');
    expect(log).not.toHaveBeenCalled();
    for (const value of Object.values(f.keys))
      expect(JSON.stringify(args)).not.toContain(value);
  } finally {
    child.mockReset();
    log.mockRestore();
  }
});

it.each([undefined, null])(
  'Pages sem env_vars (%s) é vazio segundo o contrato do Wrangler',
  async (env_vars) => {
    const f = fixture(),
      fetcher = f.io.fetcher;
    f.io.fetcher = vi.fn(async (url, options) =>
      url.includes('/pages/projects/')
        ? Response.json({
            success: true,
            result: { deployment_configs: { production: { env_vars } } },
          })
        : fetcher(url, options),
    );
    const r = await runPushActivation(f.env, f.io);
    expect(r.pages_names).toEqual([]);
    noWrites(f);
  },
);
it('secrets do Worker são conferidos mesmo quando não aparecem em settings.bindings', async () => {
  const f = fixture({
      mode: 'ATIVAR',
      worker: { VAPID_PUBLIC_KEY: 'ficticio' },
    }),
    fetcher = f.io.fetcher;
  f.io.fetcher = vi.fn(async (url, options) =>
    url.endsWith('/settings')
      ? Response.json({ success: true, result: { bindings: [] } })
      : fetcher(url, options),
  );
  await expect(runPushActivation(f.env, f.io)).rejects.toThrow(/já existe/);
  noWrites(f);
});

it('diagnóstico da publicação mostra o motivo e oculta sequências longas', async () => {
  const { cloudflareDiagnostic } = await import('./run-push-activation.mjs');
  const why = cloudflareDiagnostic(
    'Uploading...\n\u001b[31m✘ [ERROR]\u001b[0m A request to the Cloudflare API failed. Authentication error [code: 10000]\nToken abcdefghijklmnopqrstuvwxyz0123456789 inválido\nok',
  );
  expect(why).toContain('Authentication error [code: 10000]');
  expect(why).not.toContain('abcdefghijklmnopqrstuvwxyz0123456789');
  expect(why).not.toContain('Uploading');
});

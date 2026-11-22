// Somente workflow manual/main. Importar este módulo em testes não executa ações.
import { execFileSync } from 'node:child_process';
import { readFile, mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { generatePushKeys } from './push-keys.mjs';
export const workerName = 'amor-zeloso-lembretes';
export const expectedCron = '*/5 * * * *';
export const vapidNames = [
  'VAPID_SUBJECT',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
];
export class PushActivationError extends Error {}
const fail = (message) => {
  throw new PushActivationError(message);
};
const secretName = /^[A-Za-z_][A-Za-z0-9_]*$/;
const root = fileURLToPath(new URL('../', import.meta.url));

export function parseApplicationConfig(text) {
  const parsed = ts.parseConfigFileTextToJson('wrangler.jsonc', text);
  const c = parsed.config,
    databases = Array.isArray(c?.d1_databases)
      ? c.d1_databases.filter((d) => d?.binding === 'DB')
      : [];
  if (
    parsed.error ||
    !c ||
    !/^[a-z0-9][a-z0-9-]{0,62}$/.test(c.name || '') ||
    !c.pages_build_output_dir ||
    !/^\d{4}-\d{2}-\d{2}$/.test(c.compatibility_date || '') ||
    databases?.length !== 1 ||
    !/^[a-zA-Z0-9_-]+$/.test(databases[0].database_name || '') ||
    !/^[a-f0-9-]{36}$/i.test(databases[0].database_id || '')
  )
    fail(
      'Configuração da aplicação inválida. Confira nome Pages e binding DB em wrangler.jsonc.',
    );
  return {
    project: c.name,
    date: c.compatibility_date,
    database: {
      binding: 'DB',
      database_name: databases[0].database_name,
      database_id: databases[0].database_id,
    },
  };
}

/** Apenas GET; nunca repassa corpos/erros da Cloudflare para logs. */
export function cloudflareReader(env, fetcher = fetch) {
  return async (path, missingWorker = false) => {
    let response, payload;
    try {
      response = await fetcher(
        'https://api.cloudflare.com/client/v4/accounts/' +
          env.CLOUDFLARE_ACCOUNT_ID +
          path,
        {
          method: 'GET',
          redirect: 'error',
          signal: AbortSignal.timeout(20000),
          headers: { Authorization: 'Bearer ' + env.CLOUDFLARE_API_TOKEN },
        },
      );
      payload = await response.json();
    } catch {
      fail(
        'Não foi possível ler os metadados da Cloudflare. Confira conexão, conta e permissões; nenhum valor foi exibido.',
      );
    }
    if (
      missingWorker &&
      response.status === 404 &&
      payload?.success === false &&
      payload.errors?.some((e) => e.code === 10007)
    )
      return null;
    if (!response.ok || payload?.success !== true || payload.result == null)
      fail(
        'Leitura recusada ou incompleta na Cloudflare. Confira conta, projeto e permissões Pages/Workers.',
      );
    return payload.result;
  };
}
function names(entries) {
  if (!entries || typeof entries !== 'object' || Array.isArray(entries))
    fail('Metadados de secrets incompletos. Pare sem gerar chaves.');
  const all = Object.keys(entries);
  if (all.some((n) => !secretName.test(n)))
    fail('Nome de secret inesperado. Pare sem gerar chaves.');
  return all.sort();
}
export async function verifyPush(read, config, log) {
  const pages = await read('/pages/projects/' + config.project);
  const production = pages.deployment_configs?.production;
  if (
    !production ||
    typeof production !== 'object' ||
    Array.isArray(production)
  )
    fail('Metadados do Pages de produção incompletos. Pare sem gerar chaves.');
  // Como no pages secret list do Wrangler, null/ausente significa nenhum env_var.
  const vars = production.env_vars ?? {};
  const pageNames = names(vars);
  const pageSecrets = pageNames.filter((n) => vars[n]?.type === 'secret_text');
  // A listagem confirma acesso a Workers mesmo quando o agendador não existe.
  if (!Array.isArray(await read('/workers/scripts')))
    fail('Metadados de Workers incompletos. Pare sem gerar chaves.');
  const settings = await read(
    '/workers/scripts/' + workerName + '/settings',
    true,
  );
  let workerNames = [],
    workerSecrets = [],
    cron = false;
  if (settings) {
    if (!Array.isArray(settings.bindings))
      fail('Metadados do agendador incompletos. Pare sem gerar chaves.');
    const bindings = Object.fromEntries(
      settings.bindings.map((b) => [b.name, b]),
    );
    const secrets = await read('/workers/scripts/' + workerName + '/secrets');
    if (!Array.isArray(secrets))
      fail(
        'Listagem de secrets do agendador incompleta. Pare sem gerar chaves.',
      );
    workerSecrets = names(Object.fromEntries(secrets.map((s) => [s.name, s])));
    workerNames = [...new Set([...names(bindings), ...workerSecrets])].sort();
    const schedules = await read(
      '/workers/scripts/' + workerName + '/schedules',
    );
    if (!Array.isArray(schedules.schedules))
      fail('Metadados de cron incompletos. Confira o agendador.');
    cron = schedules.schedules.some((s) => s.cron === expectedCron);
  }
  const report = {
    pages_names: pageNames,
    worker_names: workerNames,
    worker_exists: !!settings,
    cron_exists: cron,
    complete: vapidNames.every(
      (n) => pageSecrets.includes(n) && workerSecrets.includes(n),
    ),
  };
  log(
    'Acesso de leitura a Pages e Workers confirmado. Escrita exige as permissões Edit descritas no guia.',
  );
  log(
    'Secrets Pages (produção), somente nomes: ' +
      (pageSecrets.join(', ') || '(nenhum)'),
  );
  log(
    'Secrets do agendador, somente nomes: ' +
      (workerSecrets.join(', ') || '(nenhum)'),
  );
  log(
    'Agendador existe: ' +
      (report.worker_exists ? 'sim' : 'não') +
      '. Cron de cinco minutos: ' +
      (cron ? 'presente' : 'ausente') +
      '.',
  );
  log(
    report.complete && cron
      ? 'Próximo passo: republicar Pages pelo fluxo habitual e testar em cada aparelho.'
      : pageNames.some((n) => vapidNames.includes(n)) ||
          workerNames.some((n) => vapidNames.includes(n))
        ? 'Próximo passo: não usar ATIVAR. Se os secrets estiverem completos, use REPUBLICAR_AGENDADOR para corrigir o código/cron; se incompletos, peça revisão humana sem copiar chaves.'
        : 'Próximo passo: conferir o guia e executar ATIVAR com a confirmação marcada.',
  );
  return report;
}

/** Só a configuração (sem chaves) vai ao disco; até o log do Wrangler é descartado. */
export async function temporaryScheduler(config, env) {
  const directory = await mkdtemp(join(tmpdir(), 'amor-zeloso-push-'));
  try {
    if (directory.startsWith(resolve(root) + sep))
      fail('Diretório temporário deve ficar fora do checkout.');
    const path = join(directory, 'wrangler.json');
    const logPath = join(directory, 'wrangler.log');
    await symlink('/dev/null', logPath);
    await writeFile(
      path,
      JSON.stringify({
        name: workerName,
        main: resolve(root, 'worker/push-scheduler.ts'),
        account_id: env.CLOUDFLARE_ACCOUNT_ID,
        compatibility_date: config.date,
        workers_dev: false,
        preview_urls: false,
        keep_vars: true,
        triggers: { crons: [expectedCron] },
        d1_databases: [config.database],
      }),
      { mode: 0o600, flag: 'wx' },
    );
    return {
      path,
      logPath,
      remove: () => rm(directory, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
/**
 * Motivo legível de uma falha do Wrangler, só para etapas sem segredo no stdin
 * (publicar o agendador). Mantém apenas linhas de erro/código e oculta qualquer
 * sequência longa que possa ser credencial ou identificador.
 */
export function cloudflareDiagnostic(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) =>
      // Remove cores do terminal (ESC[...m) sem regex de caractere de controle.
      line
        .split(String.fromCharCode(27))
        .join('')
        .replace(/\[[0-9;]*m/g, '')
        .trim(),
    )
    .filter((line) =>
      /error|erro|code[: ]+\d+|authentication|permission|unauthori[sz]ed|forbidden|not found|invalid/i.test(
        line,
      ),
    )
    .map((line) => line.replace(/[\w-]{24,}/g, '[oculto]').slice(0, 220))
    .filter((line, i, all) => line && all.indexOf(line) === i)
    .slice(0, 6)
    .join(' | ');
}
export function wrangler(args, input, env, temporary) {
  // stdio pipe: não exibir stdout/stderr/stack (podem conter o corpo do stdin).
  if (input === undefined)
    try {
      execFileSync(
        process.execPath,
        [resolve(root, 'node_modules/wrangler/bin/wrangler.js'), ...args],
        {
          cwd: root,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 180000,
          env: {
            ...env,
            CI: 'true',
            WRANGLER_SEND_METRICS: 'false',
            WRANGLER_LOG: 'error',
            WRANGLER_LOG_SANITIZE: 'true',
            WRANGLER_LOG_PATH: temporary.logPath,
          },
        },
      );
      return;
    } catch (error) {
      const why = cloudflareDiagnostic(
        String(error?.stderr ?? '') + '\n' + String(error?.stdout ?? ''),
      );
      fail(
        'A Cloudflare recusou a publicação do agendador' +
          (why ? ': ' + why : '.') +
          ' Nenhuma chave foi exibida.',
      );
    }
  execFileSync(
    process.execPath,
    [resolve(root, 'node_modules/wrangler/bin/wrangler.js'), ...args],
    {
      cwd: root,
      encoding: 'utf8',
      input,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 180000,
      env: {
        ...env,
        CI: 'true',
        WRANGLER_SEND_METRICS: 'false',
        WRANGLER_LOG: 'error',
        WRANGLER_LOG_SANITIZE: 'true',
        WRANGLER_LOG_PATH: temporary.logPath,
      },
    },
  );
}
export function maskSecret(value) {
  // Canal de comandos interpretado e ocultado pelo runner, não mensagem humana.
  const escaped = String(value)
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A');
  process.stdout.write('::add-mask::' + escaped + '\n');
}
export async function runPushActivation(env, io = {}) {
  const log = io.log ?? console.log,
    mask = io.mask ?? maskSecret;
  let temporary,
    changesStarted = false;
  try {
    const mode = env.PUSH_ACTIVATION_MODE || 'VERIFICAR';
    if (
      env.GITHUB_ACTIONS !== 'true' ||
      env.GITHUB_REF !== 'refs/heads/main' ||
      env.GITHUB_EVENT_NAME !== 'workflow_dispatch'
    )
      fail('Execute somente o workflow manual na branch main.');
    if (!['VERIFICAR', 'ATIVAR', 'REPUBLICAR_AGENDADOR'].includes(mode))
      fail('Ação inválida.');
    if (mode !== 'VERIFICAR' && env.PUSH_ACTIVATION_CONFIRM !== 'true')
      fail(
        'Marque a confirmação antes de executar uma ação que altera a Cloudflare.',
      );
    if (
      !env.CLOUDFLARE_API_TOKEN ||
      !/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID || '')
    )
      fail(
        'Configure CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID no environment lembretes-push, como na homologação.',
      );
    let app;
    try {
      app = new URL(env.APP_URL);
    } catch {
      fail('Configure APP_URL com o endereço HTTPS do aplicativo, sem e-mail.');
    }
    if (
      app.protocol !== 'https:' ||
      app.username ||
      app.password ||
      app.search ||
      app.hash
    )
      fail(
        'APP_URL deve ser HTTPS, sem credenciais, parâmetros ou fragmento. Não use e-mail.',
      );
    mask(env.CLOUDFLARE_API_TOKEN);
    const config = parseApplicationConfig(
      await (
        io.readConfig ??
        (() => readFile(resolve(root, 'wrangler.jsonc'), 'utf8'))
      )(),
    );
    const read = cloudflareReader(env, io.fetcher);
    const before = await verifyPush(read, config, log);
    if (mode === 'VERIFICAR') {
      log(
        'Somente verificação: nenhuma escrita, publicação ou geração de chaves.',
      );
      return before;
    }
    if (
      mode === 'ATIVAR' &&
      [...before.pages_names, ...before.worker_names].some((n) =>
        vapidNames.includes(n),
      )
    )
      fail(
        'Configuração VAPID já existe no Pages ou no Worker. Não gerar nem sobrescrever chaves; os aparelhos inscritos perderiam a identidade. Use VERIFICAR e siga o guia.',
      );
    if (
      mode === 'REPUBLICAR_AGENDADOR' &&
      (!before.worker_exists || !before.complete)
    )
      fail(
        'REPUBLICAR_AGENDADOR exige o agendador e os três secrets nos dois destinos. Confira VERIFICAR; não regenere chaves para completar configuração parcial.',
      );
    temporary = await (io.temporary ?? temporaryScheduler)(config, env);
    const execute = io.wrangler ?? wrangler;
    if (mode === 'ATIVAR') {
      const keys = await (io.generateKeys ?? generatePushKeys)(app.href);
      for (const n of vapidNames) {
        if (typeof keys[n] !== 'string' || !keys[n])
          fail(
            'Não foi possível gerar a identidade VAPID. Nenhum secret foi enviado.',
          );
        mask(keys[n]);
      }
      const input = JSON.stringify(
        Object.fromEntries(vapidNames.map((n) => [n, keys[n]])),
      );
      changesStarted = true;
      // O bulk cria um Worker rascunho sem cron se ele ainda não existe.
      await execute(
        ['secret', 'bulk', '--config', temporary.path],
        input,
        env,
        temporary,
      );
      await execute(
        [
          'pages',
          'secret',
          'bulk',
          '--project-name',
          config.project,
          '--env',
          'production',
        ],
        input,
        env,
        temporary,
      );
    }
    changesStarted = true;
    await execute(
      ['deploy', '--config', temporary.path, '--keep-vars'],
      undefined,
      env,
      temporary,
    );
    const after = await verifyPush(read, config, log);
    if (!after.complete || !after.worker_exists || !after.cron_exists)
      fail(
        'A publicação ainda não foi confirmada pelos metadados. Rode somente VERIFICAR após a propagação; não repita ATIVAR nem regenere chaves.',
      );
    log(
      mode === 'ATIVAR'
        ? 'Configuração concluída. Republicar Pages e testar em cada aparelho continuam sendo passos do responsável.'
        : 'Agendador republicado; nenhuma chave gerada ou gravada.',
    );
    return after;
  } catch (error) {
    if (error instanceof PushActivationError) {
      if (changesStarted)
        throw new PushActivationError(
          error.message +
            ' Pode haver configuração parcial. Não repita ATIVAR; rode somente VERIFICAR e peça revisão humana se necessário.',
        );
      throw error;
    }
    fail(
      changesStarted
        ? 'Etapa não concluída; pode haver configuração parcial. Rode somente VERIFICAR e peça revisão humana. Não repita ATIVAR nem regenere chaves. Valores e saída do Wrangler foram ocultados.'
        : 'Etapa não concluída antes da publicação. Confira configuração e permissões; nenhum valor foi exibido.',
    );
  } finally {
    if (temporary) await temporary.remove();
  }
}
export async function main(env = process.env, io = {}) {
  try {
    await runPushActivation(env, io);
    return 0;
  } catch (error) {
    (io.error ?? console.error)(
      error instanceof PushActivationError
        ? error.message
        : 'Etapa não concluída. Confira o guia; valores foram ocultados.',
    );
    return 1;
  }
}
if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url))
  process.exitCode = await main();

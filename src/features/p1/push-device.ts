import { api } from '../api';
export interface PushState {
  ready: boolean;
  configured: boolean;
  environment?: 'teste';
  public_key: string | null;
  user_id: string;
  subscriptions: {
    id: string;
    endpoint_hash: string;
    version: number;
    created_at: string;
    current: number;
    valid_until: number;
  }[];
  staff: { id: string; display_name: string; role: string }[];
}
const digest = async (endpoint: string) =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint)),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
function bytes(value: string) {
  return Uint8Array.from(
    atob(value.replaceAll('-', '+').replaceAll('_', '/')),
    (c) => c.charCodeAt(0),
  );
}
async function registration() {
  return 'serviceWorker' in navigator
    ? navigator.serviceWorker.getRegistration()
    : undefined;
}
export async function localPushDevice(state: PushState) {
  const reg = await registration(),
    sub = await reg?.pushManager?.getSubscription();
  if (!sub) return null;
  const key = await digest(sub.endpoint),
    record = state.subscriptions.find(
      (s) => s.endpoint_hash === key && s.current,
    );
  return record ? { sub, record } : null;
}
export async function reconcilePushSession() {
  const reg = await registration(),
    sub = await reg?.pushManager?.getSubscription();
  if (!sub) return;
  const state = await api<PushState>('p1/push'),
    hash = await digest(sub.endpoint);
  if (!state.subscriptions.some((s) => s.endpoint_hash === hash && s.current))
    await sub.unsubscribe();
}
export async function unsubscribeLocalPush() {
  try {
    const reg = await registration();
    await reg?.pushManager?.getSubscription().then((sub) => sub?.unsubscribe());
  } catch {
    /* Servidor já revoga a sessão; não bloquear a saída. */
  }
}
export async function enablePushDevice(state: PushState) {
  if (!state.ready || !state.configured || !state.public_key)
    throw Error(
      'Avisos no celular ainda indisponíveis. Você pode usar o calendário.',
    );
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed =
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone;
  if (ios && !installed)
    throw Error(
      'No iPhone, use o app instalado na Tela de Início, no iOS 16.4 ou mais recente.',
    );
  if (
    !('Notification' in window) ||
    !('PushManager' in window) ||
    !('serviceWorker' in navigator)
  )
    throw Error(
      'Este navegador não oferece avisos. Use Adicionar ao calendário do celular.',
    );
  // Chamado somente por escolha de aviso/botão humano; antes de qualquer await.
  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== 'granted')
    throw Error(
      'Permissão de avisos não concedida. Você pode usar o calendário ou ajustar a permissão do navegador.',
    );
  const reg = await registration();
  if (!reg?.active || !reg.pushManager)
    throw Error(
      'Reabra o app para preparar os avisos deste aparelho, ou use o calendário.',
    );
  let sub = await reg.pushManager.getSubscription();
  let current;
  if (sub) {
    const hash = await digest(sub.endpoint);
    current = state.subscriptions.find(
      (s) => s.endpoint_hash === hash && s.current,
    );
    const oldKey = sub.options.applicationServerKey,
      expected = bytes(state.public_key);
    const sameKey =
      !!oldKey &&
      oldKey.byteLength === expected.length &&
      new Uint8Array(oldKey).every((b, i) => b === expected[i]);
    if (!current || !sameKey) {
      await sub.unsubscribe();
      sub = null;
      current = undefined;
    }
  }
  if (current && sub) return { id: current.id };
  sub ??= await subscribeWithRetry(reg, bytes(state.public_key));
  const data = sub.toJSON();
  if (!data.keys?.p256dh || !data.keys.auth)
    throw Error(
      'Não foi possível preparar este aparelho. Tente novamente ou use o calendário.',
    );
  return api<{ id: string }>(
    'p1/push/subscriptions',
    'POST',
    {
      subscription: {
        endpoint: sub.endpoint,
        expirationTime: sub.expirationTime,
        keys: { p256dh: data.keys.p256dh, auth: data.keys.auth },
      },
    },
    crypto.randomUUID(),
  );
}
export async function disablePushDevice(state: PushState, id: string) {
  const record = state.subscriptions.find((s) => s.id === id);
  if (!record) return;
  const local = await localPushDevice(state);
  try {
    await api(
      'p1/push/subscriptions/' + id,
      'DELETE',
      { version: record.version },
      crypto.randomUUID(),
    );
  } finally {
    if (local?.record.id === id) await local.sub.unsubscribe();
  }
}

// O serviço de push do celular (no Android, o do Google) às vezes recusa o
// primeiro registro ("Registration failed - push service error"). Tenta mais
// uma vez e, se falhar de novo, explica em português o que conferir.
export const PUSH_SERVICE_HELP =
  'O serviço de avisos do celular recusou o registro. Confira: o app foi instalado pelo Google Chrome; o Google Play Services está atualizado; a economia de bateria ou de dados não está bloqueando o Chrome. Depois, feche o app, abra de novo e tente outra vez. Enquanto isso, use Adicionar ao calendário.';
export async function subscribeWithRetry(
  reg: Pick<ServiceWorkerRegistration, 'pushManager'>,
  key: ReturnType<typeof bytes>,
  wait = (ms: number) => new Promise((r) => setTimeout(r, ms)),
) {
  const options = { userVisibleOnly: true, applicationServerKey: key };
  try {
    return await reg.pushManager.subscribe(options);
  } catch (first) {
    if ((first as Error)?.name === 'NotAllowedError') throw first;
    await wait(1500);
    try {
      return await reg.pushManager.subscribe(options);
    } catch {
      throw Error(PUSH_SERVICE_HELP);
    }
  }
}

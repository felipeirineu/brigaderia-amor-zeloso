// Não armazena assinaturas Web Push ou credenciais.
const backupData = (data) =>
  data?.kind === 'backup' &&
  /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(data.backup_id ?? '') &&
  /^[\da-f-]{32,36}$/i.test(data.backup_key ?? '');
const safePath = (value) =>
  typeof value === 'string' && /^\/gestao(?:[/?#]|$)/.test(value)
    ? value
    : '/gestao';
self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data?.json();
  } catch {
    return;
  }
  if (!data || typeof data.title !== 'string' || typeof data.body !== 'string')
    return;
  const backup = backupData(data);
  event.waitUntil(
    self.registration.showNotification(data.title.slice(0, 100), {
      body: data.body.slice(0, 300),
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag:
        typeof data.tag === 'string'
          ? data.tag.slice(0, 100)
          : 'amor-zeloso-lembrete',
      renotify: false,
      ...(backup
        ? {
            actions: [
              { action: 'backup-open', title: 'Fazer backup' },
              { action: 'backup-snooze', title: 'Lembrar em 1 h' },
            ],
          }
        : {}),
      data: {
        url: backup ? '/gestao/backup' : safePath(data.url),
        ...(backup
          ? {
              kind: 'backup',
              backup_id: data.backup_id,
              backup_key: data.backup_key,
            }
          : {}),
      },
    }),
  );
});
async function openManagement(path) {
  const url = new URL(safePath(path), self.location.origin).href;
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  const existing = clients.find((client) =>
    client.url.startsWith(self.location.origin + '/gestao'),
  );
  if (existing) {
    await existing.navigate(url);
    return existing.focus();
  }
  return self.clients.openWindow(url);
}
async function snoozeBackup(data) {
  const root = '/api/p1/backup-reminders/' + data.backup_id;
  const response = await fetch(root, {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!response.ok) throw Error('Sessão ou configuração indisponível.');
  const state = await response.json();
  if (!state.ready || state.settings?.alert_key !== data.backup_key)
    throw Error('Lembrete alterado.');
  const result = await fetch(root + '/snooze', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      version: state.settings.version,
      alert_key: data.backup_key,
    }),
  });
  if (!result.ok) throw Error('Não foi possível adiar.');
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  for (const client of clients)
    client.postMessage({ type: 'backup-reminder-changed' });
}
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data;
  event.waitUntil(
    backupData(data) && event.action === 'backup-snooze'
      ? snoozeBackup(data).catch(() => openManagement('/gestao/backup'))
      : openManagement(
          backupData(data) ? '/gestao/backup' : safePath(data?.url),
        ),
  );
});

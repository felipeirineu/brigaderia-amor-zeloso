// Nenhuma assinatura, chave ou informação pessoal é persistida no service worker.
self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data?.json();
  } catch {
    return;
  }
  if (!data || typeof data.title !== 'string' || typeof data.body !== 'string')
    return;
  const url =
    typeof data.url === 'string' && /^\/gestao(?:[/?#]|$)/.test(data.url)
      ? data.url
      : '/gestao';
  event.waitUntil(
    self.registration.showNotification(data.title.slice(0, 100), {
      body: data.body.slice(0, 300),
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag:
        typeof data.tag === 'string'
          ? data.tag.slice(0, 100)
          : 'amor-zeloso-lembrete',
      renotify: false,
      data: { url },
    }),
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const value = event.notification.data?.url;
  const path =
    typeof value === 'string' && /^\/gestao(?:[/?#]|$)/.test(value)
      ? value
      : '/gestao';
  const url = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clients) => {
        const existing = clients.find((client) =>
          client.url.startsWith(self.location.origin + '/gestao'),
        );
        if (existing) {
          await existing.navigate(url);
          return existing.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});

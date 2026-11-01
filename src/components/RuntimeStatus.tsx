import { Button } from './Button';
import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export function RuntimeStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [update, setUpdate] = useState<(() => void) | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  useEffect(() => {
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener('online', connected);
    window.addEventListener('offline', disconnected);
    const apply = registerSW({
      onNeedRefresh() {
        setUpdate(() => () => {
          void apply(true);
        });
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
    });
    return () => {
      window.removeEventListener('online', connected);
      window.removeEventListener('offline', disconnected);
    };
  }, []);
  return (
    <div className="runtime" role="status">
      {!online
        ? 'Sem conexão · demonstração somente leitura. Nenhuma gravação é aceita.'
        : offlineReady
          ? 'Demonstração disponível offline · somente leitura'
          : 'Demonstração local · sem sincronização com banco'}
      {update && <Button onClick={update}>Atualizar aplicação</Button>}
    </div>
  );
}

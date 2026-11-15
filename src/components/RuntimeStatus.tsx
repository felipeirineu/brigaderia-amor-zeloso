import { Button } from './Button';
import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
export function RuntimeStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [update, setUpdate] = useState<(() => void) | null>(null);
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
    });
    return () => {
      window.removeEventListener('online', connected);
      window.removeEventListener('offline', disconnected);
    };
  }, []);
  if (online && !update) return null;
  return (
    <div className="runtime" role="status">
      {!online
        ? 'Sem conexão. Alterações não podem ser enviadas.'
        : 'Uma atualização do aplicativo está disponível.'}
      {update && <Button onClick={update}>Atualizar aplicação</Button>}
    </div>
  );
}

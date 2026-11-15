import { useEffect, useState } from 'react';
/** Feedback de conexão, separado do registrador único de SW em AppUpdate. */
export function OfflineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener('online', connected);
    window.addEventListener('offline', disconnected);
    return () => {
      window.removeEventListener('online', connected);
      window.removeEventListener('offline', disconnected);
    };
  }, []);
  return online ? null : (
    <p className="connection-status" role="status">
      Sem conexão. Alterações não podem ser enviadas.
    </p>
  );
}

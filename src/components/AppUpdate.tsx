import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { Button } from './Button';

/**
 * Aviso de versão nova na gestão. O app instalado guarda uma cópia para abrir
 * rápido; sem este aviso a versão nova só entrava depois de fechar o app por
 * completo. Procura atualização ao abrir, ao voltar para o app e a cada hora.
 */
export function AppUpdate() {
  const [apply, setApply] = useState<(() => void) | null>(null);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let check: (() => void) | undefined;
    const update = registerSW({
      onNeedRefresh() {
        setApply(() => () => void update(true));
      },
      onRegisteredSW(_url, registration) {
        if (!registration) return;
        check = () => {
          if (navigator.onLine) void registration.update().catch(() => {});
        };
        timer = setInterval(check, 60 * 60 * 1000);
        document.addEventListener('visibilitychange', onVisible);
      },
    });
    function onVisible() {
      if (document.visibilityState === 'visible') check?.();
    }
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  if (!apply) return null;
  return (
    <div className="app-update" aria-live="polite">
      <span>Nova versão do app disponível.</span>
      <Button variant="primary" onClick={apply}>
        Atualizar
      </Button>
    </div>
  );
}

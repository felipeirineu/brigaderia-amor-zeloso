import {
  readLocalPreference,
  writeLocalPreference,
} from '../../local-preferences';
import { useEffect, useState } from 'react';
import { orderMode } from './order-mode';
export function useOrderMode(role: string) {
  const key = 'az-order-mode-' + role;
  const [preference, setPreference] = useState(() =>
    orderMode(readLocalPreference(key)),
  );
  useEffect(() => {
    const sync = () => setPreference(orderMode(readLocalPreference(key)));
    window.addEventListener('order-mode', sync);
    return () => window.removeEventListener('order-mode', sync);
  }, [key]);
  return {
    simple: preference === 'simple',
    preference,
    setPreference: (value: string) => {
      const next = orderMode(value);
      writeLocalPreference(key, next);
      setPreference(next);
      window.dispatchEvent(new Event('order-mode'));
    },
  };
}

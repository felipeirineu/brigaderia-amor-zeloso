import {
  readLocalPreference,
  writeLocalPreference,
} from '../../local-preferences';
import { useEffect, useState } from 'react';
export function useOrderMode(role: string) {
  const key = 'az-order-mode-' + role;
  const [preference, setPreference] = useState(
      () => readLocalPreference(key) || 'auto',
    ),
    [small, setSmall] = useState(() => matchMedia('(max-width:700px)').matches);
  useEffect(() => {
    const media = matchMedia('(max-width:700px)'),
      change = () => setSmall(media.matches),
      sync = () => setPreference(readLocalPreference(key) || 'auto');
    media.addEventListener('change', change);
    window.addEventListener('order-mode', sync);
    return () => {
      media.removeEventListener('change', change);
      window.removeEventListener('order-mode', sync);
    };
  }, [key]);
  return {
    simple:
      preference === 'simple' ||
      (preference === 'auto' && small && role === 'operator'),
    preference,
    setPreference: (value: string) => {
      writeLocalPreference(key, value);
      setPreference(value);
      window.dispatchEvent(new Event('order-mode'));
    },
  };
}

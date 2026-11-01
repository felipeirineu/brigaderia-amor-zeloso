import { useRef, useState } from 'react';
import { api } from '../api';
export function useP1Save(refresh: () => Promise<void>) {
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    pending = useRef(false),
    request = useRef({ signature: '', key: crypto.randomUUID() });
  async function save(
    path: string,
    data: object,
    method: string,
    done?: () => void,
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const signature = path + method + JSON.stringify(data);
    if (request.current.signature !== signature)
      request.current = { signature, key: crypto.randomUUID() };
    try {
      await api(path, method, data, request.current.key);
      await refresh();
      done?.();
      setNotice(
        'Dados salvos. Custos e preços são estimativas, sem compras ou alterações de preço automáticas.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { save, error, setError, notice, busy };
}

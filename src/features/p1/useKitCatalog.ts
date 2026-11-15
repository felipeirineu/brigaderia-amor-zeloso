import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import type { Kit, KitSettings } from '../../../shared/kits';
/** Catálogo privado opcional: bancos anteriores continuam no fluxo legado. */
export function useKitCatalog(enabled = true) {
  const [data, setData] = useState<{ kits: Kit[]; limit: boolean }>({
    kits: [],
    limit: true,
  });
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(!enabled);
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    void api<Kit[]>('p1/kits')
      .then(async (kits) => {
        const settings = kits.length
          ? await api<KitSettings>('p1/kit-settings')
          : { limit_flavors: true };
        if (current) setData({ kits, limit: settings.limit_flavors });
      })
      .catch((e) => {
        if (current && !(e instanceof ApiError && e.status === 503))
          setError((e as Error).message);
      })
      .finally(() => {
        if (current) setLoaded(true);
      });
    return () => {
      current = false;
    };
  }, [enabled]);
  return { ...data, error, loading: enabled && !loaded };
}

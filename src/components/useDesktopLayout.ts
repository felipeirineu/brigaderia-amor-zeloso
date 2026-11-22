import { useSyncExternalStore } from 'react';

const desktopQuery = '(min-width: 1024px)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function useDesktopLayout() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(desktopQuery).matches,
    () => false,
  );
}

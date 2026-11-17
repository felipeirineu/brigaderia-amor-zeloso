import { test, expect, vi } from 'vitest';
import { readLocalPreference, writeLocalPreference } from './local-preferences';
test('preferências de interface têm fallback em memória se o navegador recusar storage', () => {
  vi.stubGlobal('localStorage', {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  });
  try {
    expect(readLocalPreference('teste-demonstração')).toBeNull();
    writeLocalPreference('teste-demonstração', 'dark');
    expect(readLocalPreference('teste-demonstração')).toBe('dark');
  } finally {
    vi.unstubAllGlobals();
  }
});

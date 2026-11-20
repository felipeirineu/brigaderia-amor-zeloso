import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test, expect } from 'vitest';
const code = readFileSync('public/theme-init.js', 'utf8');
function boot(saved: string | null, dark: boolean, blocked = false) {
  const listeners = new Map<
      string,
      (e: { detail?: string; newValue?: string; key?: string }) => void
    >(),
    root = { dataset: {} as Record<string, string> },
    meta = new Map<string, string>(),
    manifest = new Map<string, string>();
  const system = {
    matches: dark,
    addEventListener: (_name: string, fn: () => void) =>
      listeners.set('system', fn),
  };
  runInNewContext(code, {
    document: {
      documentElement: root,
      querySelector: (s: string) => ({
        setAttribute: (k: string, v: string) =>
          (s.startsWith('meta') ? meta : manifest).set(k, v),
      }),
      addEventListener: (_n: string, fn: () => void) =>
        listeners.set('ready', fn),
    },
    window: {
      matchMedia: () => system,
      addEventListener: (n: string, fn: () => void) => listeners.set(n, fn),
      dispatchEvent: () => {},
    },
    localStorage: {
      getItem: () => {
        if (blocked) throw Error();
        return saved;
      },
      setItem: (_k: string, v: string) => {
        if (blocked) throw Error();
        saved = v;
      },
    },
    Event: class {},
  });
  return { root, meta, manifest, listeners, system, saved: () => saved };
}
test('boot aplica antes do DOM pronto, segue sistema e respeita escolha manual', () => {
  const a = boot(null, true);
  expect(a.root.dataset.theme).toBe('dark');
  expect(a.meta.get('content')).toBe('#090605');
  expect(a.manifest.get('href')).toBe('/manifest-dark.webmanifest');
  a.listeners.get('az-appearance')!({ detail: 'light' });
  expect(a.root.dataset.theme).toBe('light');
  expect(a.saved()).toBe('light');
  a.listeners.get('system')!({});
  expect(a.root.dataset.theme).toBe('light');
  a.listeners.get('az-appearance')!({ detail: 'auto' });
  a.system.matches = false;
  a.listeners.get('system')!({});
  expect(a.root.dataset.theme).toBe('light');
});
test('storage indisponível/corrompido não quebra; valores arbitrários não são aplicados', () => {
  const a = boot('inválido', true, true);
  expect(a.root.dataset.theme).toBe('dark');
  a.listeners.get('az-appearance')!({ detail: 'light' });
  expect(a.root.dataset.theme).toBe('light');
  a.listeners.get('az-appearance')!({ detail: '<script>' });
  expect(a.root.dataset.theme).toBe('light');
});

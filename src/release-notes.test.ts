import { test, expect } from 'vitest';
import {
  compareVersions,
  releasesEnabled,
  shouldAnnounce,
  releaseNotes,
} from './release-notes';
test('compara versões semanticamente, incluindo pré-release e metadados', () => {
  expect(compareVersions('1.10.0', '1.2.0')).toBe(1);
  expect(compareVersions('1.0.0-beta.2', '1.0.0-beta.10')).toBe(-1);
  expect(compareVersions('1.0.0-beta', '1.0.0')).toBe(-1);
  expect(compareVersions('1.0.0+build.5', '1.0.0')).toBe(0);
  for (const v of ['1', '01.0.0', '1.0.0-01', 'x.y.z', '1.0.0<script>'])
    expect(compareVersions(v, '1.0.0')).toBeNull();
});
test('só anuncia desde 1.0.0, não reanuncia versão vista nem downgrade', () => {
  expect(releasesEnabled('0.17.0')).toBe(false);
  expect(releasesEnabled('1.0.0-beta')).toBe(false);
  expect(releasesEnabled('1.0.0')).toBe(true);
  expect(shouldAnnounce('1.0.0', null)).toBe(true);
  expect(shouldAnnounce('1.0.0', '1.0.0')).toBe(false);
  expect(shouldAnnounce('1.0.0', '1.1.0')).toBe(false);
  expect(shouldAnnounce('1.0.1', '1.0.0')).toBe(true);
  expect(shouldAnnounce('1.0.0', 'corrompido')).toBe(true);
});
test('histórico é único, ordenado e até três itens por versão', () => {
  expect(releaseNotes.some((n) => n.version === __APP_VERSION__)).toBe(true);
  expect(new Set(releaseNotes.map((n) => n.version)).size).toBe(
    releaseNotes.length,
  );
  releaseNotes.forEach((n, i) => {
    expect(n.items.length).toBeLessThanOrEqual(3);
    if (i)
      expect(compareVersions(releaseNotes[i - 1].version, n.version)).toBe(1);
  });
});

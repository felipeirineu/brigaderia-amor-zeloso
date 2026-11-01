import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
it('interface, ajuda e tutorial não incluem atribuições pessoais internas', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? walk(join(dir, e.name))
        : /\.(tsx?|css)$/.test(e.name) && !e.name.includes('.test.')
          ? [join(dir, e.name)]
          : [],
    );
  const forbidden = new RegExp('\\b' + 'Feli' + 'pe' + '\\b', 'i');
  for (const file of walk('src'))
    expect(readFileSync(file, 'utf8'), file).not.toMatch(forbidden);
});

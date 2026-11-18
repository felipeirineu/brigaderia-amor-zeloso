import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';
it('gestão não usa confirm/prompt nativo e todas as escolhas assíncronas são aguardadas', async () => {
  const native = [],
    unawaited = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
        continue;
      }
      if (!/\.(tsx?|jsx?)$/.test(path)) continue;
      const source = ts.createSourceFile(
        path,
        await readFile(path, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      function scan(node) {
        if (ts.isCallExpression(node)) {
          if (
            (ts.isIdentifier(node.expression) &&
              ['confirm', 'prompt'].includes(node.expression.text)) ||
            (ts.isPropertyAccessExpression(node.expression) &&
              ['window', 'globalThis'].includes(
                node.expression.expression.getText(source),
              ) &&
              ['confirm', 'prompt'].includes(node.expression.name.text))
          )
            native.push(path);
          if (
            ts.isIdentifier(node.expression) &&
            ['askConfirmation', 'askPrompt'].includes(node.expression.text) &&
            !ts.isAwaitExpression(node.parent)
          )
            unawaited.push(path);
        }
        ts.forEachChild(node, scan);
      }
      scan(source);
    }
  }
  await visit('src');
  expect(native).toEqual([]);
  expect(unawaited).toEqual([]);
});

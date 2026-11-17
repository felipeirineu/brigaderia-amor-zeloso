import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { AlcoholTag } from './AlcoholTag';
it('mantém o aviso completo acessível e o selo curto com ícone decorativo', () => {
  const html = renderToStaticMarkup(createElement(AlcoholTag));
  expect(html).toContain('aria-label="Contém álcool"');
  expect(html).toContain('role="img"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('🍸');
  expect(html).toContain('Álcool');
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { Button } from './Button';
it('preserva semântica nativa e expõe carregamento sem perder o rótulo', () => {
  const html = renderToStaticMarkup(
    createElement(Button, {
      type: 'submit',
      loading: true,
      children: 'Confirmar',
    }),
  );
  expect(html).toContain('type="submit"');
  expect(html).toContain('disabled=""');
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain('Confirmar');
  expect(html).toContain('button-spinner');
});
it('mantém links reais e chips selecionados acessíveis', () => {
  const html = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(Button, {
        to: '/gestao',
        variant: 'ghost',
        children: 'Hoje',
      }),
    ),
  );
  expect(html).toContain('href="/gestao"');
  const chip = renderToStaticMarkup(
    createElement(Button, { 'aria-pressed': true, children: 'Entrega' }),
  );
  expect(chip).toContain('az-button--chip');
  expect(chip).toContain('aria-pressed="true"');
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { Button } from './Button';
import { AvatarChip } from './AvatarChip';
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

it('chip sem seleção não reserva ícone vazio; seleção sem ícone exibe indicação', () => {
  const plain = renderToStaticMarkup(
    createElement(Button, { 'aria-pressed': false }, 'Outra'),
  );
  expect(plain).not.toContain('az-button-icon');
  expect(plain).toContain('aria-pressed="false"');
  expect(
    renderToStaticMarkup(
      createElement(Button, { 'aria-pressed': true }, 'Outra'),
    ),
  ).toContain('az-button-icon');
});
it('avatar e rótulo permanecem separados e visíveis em chip selecionado', () => {
  const avatar = createElement('span', { 'data-demo-avatar': 'true' }, 'DA');
  const html = renderToStaticMarkup(
    createElement(AvatarChip, { 'aria-pressed': true, avatar }, 'DEMONSTRAÇÃO'),
  );
  expect(html).toContain('data-demo-avatar="true"');
  expect(html).toContain('avatar-chip');
  expect(html).toContain('type="button"');
  expect(html.indexOf('data-demo-avatar')).toBeLessThan(
    html.indexOf('az-button-label'),
  );
  expect(html).not.toContain('lucide-check');
});

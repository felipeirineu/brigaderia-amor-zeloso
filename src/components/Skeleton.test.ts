import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { SkeletonList, SkeletonToday } from './Skeleton';

it('agrupa as formas decorativas em uma região ocupada sem status duplicado', () => {
  const html = renderToStaticMarkup(
    createElement(SkeletonList, { label: 'Carregando clientes…', count: 3 }),
  );
  expect(html.match(/aria-busy="true"/g)).toHaveLength(1);
  expect(html).toContain('skeleton-accessible">Carregando clientes…');
  expect(html).not.toContain('role="status"');
  expect(html).not.toContain('style=');
  expect(html.match(/class="panel skeleton-card /g)).toHaveLength(3);
});
it('reserva produção e quatro valores para administrador, mantendo entregas primeiro para operadora', () => {
  const owner = renderToStaticMarkup(
    createElement(SkeletonToday, { owner: true }),
  );
  const operator = renderToStaticMarkup(
    createElement(SkeletonToday, { owner: false }),
  );
  expect(owner).toContain('skeleton-card-production');
  expect(operator).not.toContain('skeleton-card-production');
  expect(owner.match(/class="skeleton-stat"/g)).toHaveLength(4);
  expect(owner.match(/skeleton-card-delivery/g)).toHaveLength(2);
  expect(operator.indexOf('skeleton-card-delivery')).toBeLessThan(
    operator.indexOf('skeleton-stats'),
  );
});

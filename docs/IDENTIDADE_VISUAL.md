# Identidade visual autorizada pelo Felipe

Fonte: `docs/marca/logo-brigaderia-amor-zeloso.png`, preservado sem alterações. Os derivados técnicos (redução, padding e formatos) são gerados por `npm run brand:build` com Sharp, sem recriar lettering ou inventar elementos. Reexecutar o comando após uma troca autorizada da fonte.

- PWA 192/512, maskable 512 com logo a 70% (margem segura), apple-touch-icon 180, favicon ICO/PNG32 e WebP de interface em `public/`.
- Marrom #321D10, creme #F9ECD7, dourado #B8915B; rosé #AD776B como apoio. Dourado é decoração, não texto pequeno sobre creme. Texto dourado escuro alternativo #76532F passa AA sobre creme.
- Corpo: system-ui/sans local do aparelho. Títulos: Georgia/serif do aparelho, aproximação tipográfica, sem afirmar identidade exata do lettering. Nenhuma fonte remota/CDN.
- Navegação: Lucide React (licença ISC), ícones SVG decorativos com texto/aria-label, sem glifos dependentes da fonte do dispositivo.
- `node tests/integration/brand.mjs` verifica dimensões, formato ICO e contraste AA dos pares de texto definidos.

Logo não publica catálogo nem informa preços/sabores. O mascote permanece fora do aplicativo. Instalações existentes podem precisar atualizar o PWA para refletir os novos ícones; iOS pode exigir remover/recriar somente o atalho, sem excluir dados do banco.

# Fotos dos sabores

Recortes do catálogo enviado pelo responsável em 08/11/2026 ([`../fotos/catalogo-sabores-grade.jpg`](../fotos/catalogo-sabores-grade.jpg); versão em lista: [`../fotos/catalogo-sabores-lista.png`](../fotos/catalogo-sabores-lista.png)). Uso autorizado. Cada recorte é um WebP de 320×320 px, próprio para cartões de até ~160 px CSS em telas 2x. Não ampliar além disso.

## Correspondência foto ↔ sabor

A foto fica ligada ao produto ou à variante no cadastro, e o humano pode alterá-la. O app **sugere** a foto quando o nome cadastrado coincide com o sabor ou com um dos apelidos da tabela (`shared/flavors.ts`).

| Arquivo            | Sabor                   | Nomes reconhecidos na sugestão    | Descrição do catálogo                                         |
| ------------------ | ----------------------- | --------------------------------- | ------------------------------------------------------------- |
| `tradicional.webp` | Brigadeiro              | Brigadeiro, Tradicional           | O clássico brigadeiro de chocolate com granulado.             |
| `colorido.webp`    | Brigadeiro Colorido     | Brigadeiro Colorido, Colorido     | Massa do brigadeiro tradicional com confeitos coloridos.      |
| `amendoim.webp`    | Brigadeiro com Amendoim | Brigadeiro com Amendoim, Amendoim | Brigadeiro de chocolate envolto em amendoim crocante.         |
| `prestigio.webp`   | Prestígio               | Prestígio                         | Chocolate e coco, com cobertura de coco ralado.               |
| `beijinho.webp`    | Beijinho                | Beijinho                          | Brigadeiro de coco ralado fresco.                             |
| `cajuzinho.webp`   | Cajuzinho               | Cajuzinho                         | Amendoim com chocolate, textura aveludada.                    |
| `uva.webp`         | Surpresa de Uva         | Surpresa de Uva, Uva              | Brigadeiro branco com uma uva fresca no centro.               |
| `limao.webp`       | Limão                   | Limão                             | Brigadeiro de limão finalizado com raspas.                    |
| `caipirinha.webp`  | Caipirinha              | Caipirinha                        | Brigadeiro de limão com ampola de cachaça. **Contém álcool.** |

**Renomeados (confirmado em 08/11/2026):** Casadinho passou a se chamar Prestígio e Coco passou a se chamar Beijinho. As chaves antigas `casadinho` e `coco` continuam aceitas e mostram a foto nova, mas não aparecem mais na escolha.

Brigadeiro, Cajuzinho e Limão já existiam: o arquivo foi trocado pela foto nova com o mesmo nome, então os produtos que já usam essas fotos passam a mostrar a nova sem nenhuma ação.

## Regras

- Nada é gravado no banco por seed ou migração; a foto é escolhida no cadastro.
- As descrições acima são do material de divulgação. Não são ficha técnica nem lista de alérgenos.
- Sabor sem foto usa o ícone de reserva (R3-4).

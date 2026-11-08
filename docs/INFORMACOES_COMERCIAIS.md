# Informações comerciais vigentes

## Sabores e embalagens

**Catálogo de 08/11/2026** (material de divulgação enviado pelo responsável; fotos e descrições em [marca/sabores](marca/sabores/README.md)):

Brigadeiro · Brigadeiro Colorido · Brigadeiro com Amendoim · Prestígio · Beijinho · Cajuzinho · Surpresa de Uva · Limão · Caipirinha (contém cachaça).

**Tamanhos (peso médio por unidade, varia com o sabor e os confeitos):**

| Tamanho | Indicação do catálogo                | Unidades por caixa | Preço da caixa                                     |
| ------- | ------------------------------------ | ------------------ | -------------------------------------------------- |
| 15 g    | Festas infantis                      | **a confirmar**    | **a confirmar**                                    |
| 23 g    | Brindes e festas de jovens e adultos | **a confirmar**    | **a confirmar**                                    |
| 30 g    | Revendas ou brindes                  | 12                 | R$ 42,00 (confirmado para os 5 sabores anteriores) |

Confirmado antes do catálogo (07/11/2026): Tradicional, Casadinho, Cajuzinho, Côco e Limão em 30 g, 12 por caixa, R$ 42,00. **Renomeados (confirmado em 08/11/2026):** Casadinho → Prestígio e Côco → Beijinho. **A confirmar:** se R$ 42,00 vale para os 9 sabores em 30 g; preço e unidades por caixa de 15 g e 23 g.

O preço corresponde a uma caixa (4200 centavos), não a cada brigadeiro. Cada tamanho é uma variante do produto no cadastro privado (peso, unidades por caixa e preço). Alterações futuras preservam snapshots dos pedidos.

**Caixa mista permitida:** mesmo preço da caixa (atualmente R$ 42,00), composição livre entre os sabores ativos, total igual às unidades por caixa (atualmente 12) e mesmo peso por unidade (a caixa mista só junta sabores do mesmo tamanho). Quantidade no pedido indica caixas iguais; a composição indica unidades de cada sabor dentro de uma caixa. Não há acréscimo de preço por misturar os sabores vigentes. Valores e capacidade vêm da embalagem cadastrada; alterações futuras preservam snapshots dos pedidos.

Esta é a regra comercial vigente. A montagem no app já está disponível conforme o histórico de 07/11/2026; veja [situação da R11](FASE_R11_CAIXA_MISTA.md).

Perfil B2B com pedidos recorrentes, entrega pela equipe ou motoboy e condições configuráveis por cliente. Venda avulsa, preços de revenda, receitas, ingredientes, alérgenos, validade, conservação, custos, rotas e chave Pix dependem de cadastro quando não definidos. Não deduzir dados novos de fotografias.

## Uso na implementação

- Cadastro privado autenticado; não inserir produtos/preços por seed ou migração.
- Fixtures fictícias e identificadas como demonstração, separadas dos dados reais.
- Não publicar dados comerciais no shell de demonstração ou no service worker.
- Catálogo público permanece desligado até ativação expressa.

# Informações comerciais vigentes

## Sabores e embalagens

| Sabor                     | Peso por unidade | Unidades por caixa | Preço da caixa |
| ------------------------- | ---------------- | ------------------ | -------------- |
| Tradicional (carro-chefe) | 30 g             | 12                 | R$ 42,00       |
| Casadinho                 | 30 g             | 12                 | R$ 42,00       |
| Cajuzinho                 | 30 g             | 12                 | R$ 42,00       |
| Côco                      | 30 g             | 12                 | R$ 42,00       |
| Limão                     | 30 g             | 12                 | R$ 42,00       |

O preço corresponde a uma caixa (4200 centavos), não a cada brigadeiro. Alterações futuras são feitas no cadastro privado, preservando snapshots dos pedidos. A correspondência das fotos está em marca/sabores/README.md; o vínculo no produto/variante é editável.

**Caixa mista permitida:** mesmo preço da caixa (atualmente R$ 42,00), composição livre entre os sabores ativos, total igual às unidades por caixa (atualmente 12) e mesmo peso por unidade (30 g). Quantidade no pedido indica caixas iguais; a composição indica unidades de cada sabor dentro de uma caixa. Não há acréscimo de preço por misturar os sabores vigentes. Valores e capacidade vêm da embalagem cadastrada; alterações futuras preservam snapshots dos pedidos.

Esta é a regra comercial vigente. A montagem no app já está disponível conforme o histórico de 07/11/2026; veja [situação da R11](FASE_R11_CAIXA_MISTA.md).

Perfil B2B com pedidos recorrentes, entrega pela equipe ou motoboy e condições configuráveis por cliente. Venda avulsa, preços de revenda, receitas, ingredientes, alérgenos, validade, conservação, custos, rotas e chave Pix dependem de cadastro quando não definidos. Não deduzir dados novos de fotografias.

## Uso na implementação

- Cadastro privado autenticado; não inserir produtos/preços por seed ou migração.
- Fixtures fictícias e identificadas como demonstração, separadas dos dados reais.
- Não publicar dados comerciais no shell de demonstração ou no service worker.
- Catálogo público permanece desligado até ativação expressa.

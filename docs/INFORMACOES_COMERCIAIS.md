# Informações comerciais vigentes

## Sabores e embalagens

**Catálogo de 08/11/2026** (material de divulgação enviado pelo responsável; fotos e descrições em [marca/sabores](marca/sabores/README.md)):

Brigadeiro · Brigadeiro Colorido · Brigadeiro com Amendoim · Prestígio · Beijinho · Cajuzinho · Surpresa de Uva · Limão · Caipirinha (contém cachaça).

**Kits e valores (tabela de 08/11/2026, [imagem](marca/fotos/kits-e-valores.jpg))**: o cliente escolhe o tamanho do brigadeiro e a quantidade do kit. O preço é do kit inteiro, igual para qualquer combinação de sabores dentro do limite.

| Kit       | Sabores no kit | 15 g      | 23 g      | 30 g      |
| --------- | -------------- | --------- | --------- | --------- |
| 12 doces  | até 3          | R$ 27,00  | R$ 33,00  | R$ 42,00  |
| 25 doces  | até 5          | R$ 47,00  | R$ 63,00  | R$ 85,00  |
| 50 doces  | até 5          | R$ 87,00  | R$ 119,00 | R$ 159,00 |
| 100 doces | até 5          | R$ 157,00 | R$ 227,00 | R$ 289,00 |

Indicação de cada tamanho (peso médio; varia com o sabor e os confeitos):

- **15 g:** festas infantis.
- **23 g:** brindes e festas de jovens e adultos.
- **30 g:** revendas, brindes e presentes. É a caixa de 12 que os estabelecimentos já compram (R$ 42,00).

**Peso da massa (informado pelo Tiago em 08/11/2026):** os pesos do catálogo são do doce já confeitado. A massa padrão pesa **13 g** (doce de 15 g), **20 g** (23 g) e **26 g** (30 g).

**Receita e custos:** uma receita (lote) corresponde a **1 lata de leite condensado**. O gás custa em média **R$ 0,74 por receita**. Pétala: R$ 3,50 o pacote com 50. Por enquanto só existem kits de doces; kits de lembrancinha ficam para o futuro.

Regras do kit:

- A soma das unidades de cada sabor é exatamente a quantidade do kit (12, 25, 50 ou 100).
- Os sabores do kit são todos do mesmo tamanho.
- O número de sabores diferentes respeita o limite (3 no kit de 12, 5 nos demais). O limite fica no cadastro do kit, editável pelo administrador.
- Kit de um sabor só é um kit com um sabor; o preço é o mesmo.
- **Contém álcool:** Caipirinha (ampola de cachaça). O app mostra o aviso no pedido e no WhatsApp.

**Clientes (a partir de 08/11/2026):** além dos estabelecimentos com pedidos recorrentes (revenda), a brigaderia passa a atender pessoas para festas infantis, festas de jovens e adultos, brindes e presentes, em geral com pedido único e data marcada.

O preço corresponde ao kit inteiro (ex.: 4200 centavos no kit de 12 de 30 g), não a cada brigadeiro. Alterações futuras preservam snapshots dos pedidos.

**Caixa mista = kit com mais de um sabor.** Mesmo preço do kit, mesmo tamanho para todos os sabores, total igual à quantidade do kit e **até 3 sabores no kit de 12** (até 5 nos maiores). Na tabela de 08/11/2026 esse limite substitui a "composição livre" registrada em 03/11/2026 (R11-6); a mudança passa a valer no app com a fase R15. Quantidade no pedido indica kits iguais; a composição indica unidades de cada sabor dentro de um kit.

Esta é a regra comercial vigente. A montagem no app já está disponível conforme o histórico de 07/11/2026; veja [situação da R11](FASE_R11_CAIXA_MISTA.md).

Perfil B2B com pedidos recorrentes, entrega pela equipe ou motoboy e condições configuráveis por cliente. Venda avulsa, preços de revenda, receitas, ingredientes, alérgenos, validade, conservação, custos, rotas e chave Pix dependem de cadastro quando não definidos. Não deduzir dados novos de fotografias.

## Uso na implementação

- Cadastro privado autenticado; não inserir produtos/preços por seed ou migração.
- Fixtures fictícias e identificadas como demonstração, separadas dos dados reais.
- Não publicar dados comerciais no shell de demonstração ou no service worker.
- Catálogo público permanece desligado até ativação expressa.

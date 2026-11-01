# Pedidos por fotos — R3

## Produzido

Modo simples para criar e ajustar pedidos antes da produção: Cliente → Sabores → Revisar → Confirmar. Grade de duas colunas no celular, embalagens existentes, contadores apenas para itens escolhidos, total fixo e confirmação atômica/idempotente. Modelo válido preenche quantidades; sem modelo, repetir último pedido é uma ação explícita. Sem histórico começa vazio.

MoneyInput usa centavos inteiros, limpa ao focar, restaura ao sair vazio, aceita colagem e tem OK. QuantityInput mantém quantidades positivas com botões e remoção separada. Formulários existentes usam adaptadores para a mesma máscara. Fotos dos cinco sabores ficam no Worker privado, servidas somente com sessão, sem arquivo estático público nem precache. Cadastro permite escolher/trocar a foto e sugerir pelo nome com confirmação humana; não cria produtos.

Preferência local não sensível em Mais → Preferências. Operador no celular usa modo simples automaticamente; computador usa completo. Tutorial atualizado.

## Testes executados

44 testes unitários; integração R3 (confirmação, repetição, CAS, isolamento, totais, fotos privadas); build e tipagem; seis E2E de R3 e gestão nas combinações Chromium mobile/desktop e WebKit mobile. Sem reduzir atributos de segurança dos cookies de produção.

## Limitações

WebKit simulado não substitui iPhone físico. Escritas exigem conexão. Ajustes de pedidos confirmados exigem reabertura antes da produção; preços históricos são preservados. Preferência fica neste navegador.

## Ativação pelo administrador

Não aplicar migrações remotas automaticamente. Faça o backup e as verificações de `ATIVACAO.md`. Com as migrações anteriores aplicadas, execute no terminal do repositório:

```sh
npx wrangler d1 migrations apply brigaderia-amor-zeloso-homologacao --remote --config wrangler.jsonc
```

Resultado esperado: migrações pendentes aplicadas, incluindo `0010_mobile_orders.sql`. Confira o nome real do banco em `wrangler.jsonc` antes do comando. Se houver erro, pare e guarde a mensagem, sem apagar tabelas nem repetir SQL parcial. Ative operação, financeiro e P1 seguindo o guia, um deploy e teste por etapa; só então altere `MOBILE_ENABLED` para `"true"` em `wrangler.jsonc`, salve, faça commit/push e aguarde o deploy (as variáveis desse arquivo têm precedência sobre o painel). Resultado: Mais → Preferências e fotos no cadastro. Se falhar, volte MOBILE_ENABLED para false e refaça o deploy; não desfaça migrações apagando dados. Catálogo continua false.

## Pendências

Homologação e ativação remotas; uso em aparelhos físicos. Localização e despesas de deslocamento pertencem à R4.

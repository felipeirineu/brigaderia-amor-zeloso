# Começar de verdade: backup, atualização do banco, limpeza dos testes e cadastro

> **Limpeza concluída em 14/11/2026** (execução manual nº 2, sem restos e com zero vínculos quebrados). O botão de limpeza foi removido do GitHub depois do uso; o script `scripts/clean-test-data.mjs` e seu teste continuam no repositório caso seja preciso recriar o workflow com nova aprovação do responsável.

Roteiro para o responsável (Felipe), autorizado em 14/11/2026: todos os pedidos existentes são de teste. Tempo total: uns 30 minutos. Nada aqui publica o app nem muda as flags.

## 1. Backup (no app, 2 min)

1. Entre no app como administrador.
2. **Mais → Ferramentas → Backup → Baixar**.
3. Guarde o arquivo `.sql` fora do GitHub (ex.: Google Drive privado). Ele contém dados de clientes.

## 2. Atualizar o banco (GitHub, 5 min)

Em **GitHub → Actions → Homologação D1 (manual) → Run workflow** (branch `main`):

1. `mode = PRE_CHECAGEM`, deixe a caixa desmarcada → **Run**. Espere ficar verde e confira em "Pré-checar ou aplicar pendentes" a lista `pending` (0016, 0017, 0018, 0019…).
2. Rode de novo com `mode = APLICAR_PENDENTES` e marque a caixa de backup → **Run**. Verde = banco atualizado.

Se ficar vermelho, pare e me mande o print; não repita às cegas.

## 3. Limpar os testes (GitHub, 5 min)

Em **Actions → Limpeza dos dados de teste (manual) → Run workflow** (branch `main`):

1. **Prévia primeiro:** `modo = LIMPEZA_PREVIA`. Marque "apagar clientes" e/ou "apagar produtos" se quiser que eles também saiam. Rode e abra o passo "Prévia ou limpeza": aparece quantas linhas seriam apagadas por tabela e o que fica mantido.
   - **Clientes:** marque só se **todos** os clientes cadastrados forem de teste. Se já importou os 16 estabelecimentos reais, deixe desmarcado.
   - **Produtos:** marcar apaga produtos, variantes e as fichas ligadas a eles. Recomendado, já que os sabores serão recadastrados um por produto.
2. **Aplicar:** mesmas escolhas, `modo = LIMPEZA_APLICAR`, marque "Baixei o backup…" e digite `APAGAR TESTES` → **Run**. Verde = limpo, com zero vínculos quebrados.

**Sempre apagado:** pedidos, itens e caixas mistas, recebimentos, fechamentos e créditos, modelos recorrentes, lembretes, despesas e corridas, movimentos e saldo de estoque.
**Sempre mantido:** acessos (Felipe, Tiago, Alda) e sessões, nomes e fotos da equipe, endereço da base, Pix e configurações, mensagens prontas, insumos, kits e o histórico de auditoria.

## 4. Cadastro inicial (no app, 5 min)

1. **Mais → Importar cadastro inicial** (só o administrador vê).
2. Escolha a planilha `cadastro-inicial-brigaderia.xlsx` (abas Sabores, Insumos, Fichas e Clientes) e toque em **Ver prévia**.
3. Confira a lista. Se aparecer algum erro, ele diz a aba e a linha: corrija na planilha e escolha o arquivo de novo.
4. Toque em **Confirmar cadastro**. O que já existir com o mesmo nome fica como está, então repetir a importação não duplica nada.

Depois disso, o Tiago só cadastra o que for novo: as 4 receitas que faltam (Prestígio, Brigadeiro com Amendoim, Surpresa de Uva e Limão), etiquetas, telefones dos clientes e, quando a R15 estiver no app, os kits (Mais → Kits).

A planilha tem custos e clientes: guarde fora do GitHub e não envie por WhatsApp.

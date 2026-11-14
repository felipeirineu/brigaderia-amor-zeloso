# Começar de verdade: backup, atualização do banco, limpeza dos testes e cadastro

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

## 4. Cadastro inicial (no app, 15 min)

1. **Produtos:** um por sabor, com o nome do catálogo (Brigadeiro, Brigadeiro Colorido, Brigadeiro com Amendoim, Prestígio, Beijinho, Cajuzinho, Surpresa de Uva, Limão, Caipirinha). Em cada um, a variante "Caixa 12 un.", 30 g, 12 unidades, R$ 42,00 e a foto sugerida.
2. **Insumos:** pela planilha `insumos-para-cadastrar.xlsx`.
3. **Fichas:** pela planilha `fichas-para-cadastrar.xlsx`.
4. **Clientes:** Mais → Importar clientes com `clientes-para-importar.xlsx` (telefone opcional).
5. **Kits:** quando a R15 estiver no app, em Mais → Kits, pela tabela de kits.

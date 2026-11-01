# Estoque, importação de clientes e backup — passos curtos

Código de P1-6/P1-8/P1-9. `P1_TOOLS_ENABLED=false` por padrão. Não houve migração, restauração ou ativação remota pelo agente. Dados de testes são fictícios, identificados como DEMONSTRAÇÃO.

## Ativar depois do backup

Use primeiro ATIVACAO.md e FASE_2A.md para login, backup e migrações anteriores. A ordem completa é 0003 → 0004 → 0005 → 0006 → 0007 → 0008 → 0009 → 0010 → 0011 → **0012_inventory.sql** → **0013_customer_imports.sql**. Não cole trechos de SQL no console.

1. No PowerShell, dentro da pasta do projeto:

   ```powershell
   git pull --ff-only origin main
   npm ci
   npx wrangler login
   npm run ops:preflight -- --remote brigaderia-amor-zeloso-homologacao
   ```

   **Esperado:** migrações, contagens sem dados pessoais, FKs zero. Se 0001/0002 aparecerem pendentes num banco preenchido, pare para reconciliar o histórico. Erro de conta/banco/login: pare, confira a conta e repita apenas a consulta. Não apague tabelas.

2. Exporte um backup privado antes de migrar, com ninguém cadastrando:

   ```powershell
   New-Item -ItemType Directory -Force .local
   npx wrangler d1 export brigaderia-amor-zeloso-homologacao --remote --config wrangler.jsonc --output .local/antes-complemento-p1.sql
   npm run ops:restore-check -- .local/antes-complemento-p1.sql
   ```

   **Esperado:** arquivo na pasta .local e restauração em diretório **local novo**, com contagens iguais e FKs zero. Antes de atualizar, o ensaio pode mostrar 0012/0013 pendentes. Se a restauração falhar, não migre: guarde o arquivo e a mensagem, confira espaço/caminho/formato com apoio técnico. Arquivo maior que zero sozinho não comprova backup válido. Nunca envie SQL ao chat/GitHub.

3. Com backup conferido e sem cadastros em andamento:

   ```powershell
   npx wrangler d1 migrations apply brigaderia-amor-zeloso-homologacao --remote --config wrangler.jsonc
   npm run ops:preflight -- --remote brigaderia-amor-zeloso-homologacao
   ```

   **Esperado:** pendentes aplicadas uma vez, pending vazio, FKs zero, contagens anteriores preservadas e schema_tools_ready true. As tabelas inventory_balances/inventory_events/customer_imports começam vazias. Erro: mantenha a flag false e pare; não use reset/DROP nem reaplique fragmentos por tentativa.

4. Siga a ordem de flags de ATIVACAO.md, com deploy/teste a cada uma. Depois de P1 validado, altere somente `P1_TOOLS_ENABLED` para `"true"` no arquivo `wrangler.jsonc`:

   ```powershell
   git add wrangler.jsonc
   git commit -m "config: ativar ferramentas P1 validadas"
   git push origin main
   ```

   **Esperado:** CI verde e deploy Pages concluído para esse commit; Mais mostra Estoque e, para administrador, Importar clientes e Backup privado. As variáveis do arquivo são a fonte da configuração; não alterar somente no painel. Se houver erro, volte apenas a flag para false com outro commit/push e aguarde deploy. Flags não desfazem dados. Catálogo permanece false.

## Conferir estoque

1. Cadastre insumo/embalagem com sua unidade em Mais → Insumos. Não invente quantidade/custo: use a conferência física.
2. Mais → Estoque → Movimentar. Entrada, quantidade e motivo → Salvar movimento. **Esperado:** saldo e histórico atualizados. Em erro de versão, atualize antes de repetir; o servidor não duplica a mesma confirmação.
3. Administrador: informe mínimo e Salvar mínimo. **Esperado:** alerta quando saldo estiver abaixo. Vazio significa sem mínimo; zero precisa ser explícito.
4. Consumo/perda retiram do saldo; ajuste permite adicionar ou retirar com motivo. **Esperado:** saldo negativo recusado. Se recusar, confira unidade e movimento; não lance entrada fictícia para contornar.
5. Correção: motivo → Estornar este movimento. Só administrador estorna registros antigos/de outra pessoa; operador apenas seus registros de hoje. Entrada já consumida pode não ser estornada se tornaria saldo negativo: confira os movimentos posteriores antes de corrigir.

Previsão/lista de compras não baixa estoque nem cria gasto. Lote/validade são anotações, não controle FEFO por lote. Trocar unidade de insumo com histórico exige outro cadastro, para não converter saldos silenciosamente.

## Importar clientes

1. Use apenas contatos autorizados. Prepare CSV UTF-8 ou XLSX (primeira aba), até 50 clientes e 1 MB, com cabeçalhos `nome` e `telefone`; `email` e `notas` opcionais. Excel: telefone como texto, sem fórmulas/macros. O leitor usa bibliotecas livres read-excel-file e fflate, sem serviço externo pago.
2. Mais → Importar clientes → escolher arquivo → Ver prévia. **Esperado:** nome/telefone normalizado e resultado por linha; nenhum registro gravado ainda. Arquivo original fica em memória no navegador; somente linhas são enviadas para validação. Se der erro, corrija cabeçalho/tipo/linhas; arquivo grande precisa ser dividido. XLS antigo não é aceito.
3. Confira e selecione linhas → Confirmar importação. **Esperado:** resumo de criados/ignorados. Telefones existentes, inclusive arquivados, não são atualizados; repetidos no arquivo são recusados. Repetição/concorrência não duplicam. Se a rede cair, confira lista/histórico antes de tentar com outra seleção.

Não há importação de histórico de pedidos nem coleta de contatos de WhatsApp. Fixtures fictícias foram usadas nos testes; não há planilha real de clientes embutida.

## Baixar e restaurar backup do aplicativo

1. Administrador: Mais → Backup privado → Baixar backup privado. **Esperado:** SQL na pasta de downloads. Se der erro de tamanho/schema, use o exportador Wrangler do passo 2 de ativação, sem apagar dados para reduzir o backup.
2. Guarde uma cópia em `.local/backup-gestao.sql`, fora do Git. O SQL contém dados pessoais, fotos, autorizações e chave Pix cadastrada; guarde em pasta protegida e cópia externa privada. Sessões/tokens/tentativas de login/caches não são restaurados.
3. No PowerShell:

   ```powershell
   npm run ops:restore-check -- .local/backup-gestao.sql
   ```

   **Esperado:** diretório local novo, contagens e FKs zero. Compare quantidades de clientes, pedidos, recebimentos, despesas, receitas, estoque e fotos; confira amostras privadas. Se migrações foram aplicadas manualmente sem histórico, pending pode divergir: não inventar registros de migração sem revisão. Se o ensaio falhar, o backup ainda não está validado; preserve arquivo e mensagem. Nenhum comando desse script altera banco remoto.

4. Mantenha a cópia anterior até validar a nova. A exportação do app é de uma organização e seu schema; não inclui configurações/segredos da conta Cloudflare. Limite do app: 10 mil linhas/4 MB, sujeito a CPU/memória do plano; para bases maiores use Wrangler.

Não há restauração pelo navegador nem sobre a base usada diariamente. Uma restauração real deve ser ensaiada em base separada, incluindo login/allowlist e comparação privada, antes de uma troca planejada de binding.

## Produzido, testes e pendências

Relatório por item em P1_ETAPAS.md. Integrações de estoque/importação/exportação, CSV/XLSX e download em Chromium mobile/desktop e WebKit mobile. Ensaio de SQL com fotos, UTF-8/NUL e eventos em SQLite e Wrangler D1 local passou, com FKs zero. Uso em aparelhos físicos e conferência com dados reais continuam para homologação; serviços pagos e catálogo não foram ativados.

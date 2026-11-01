# Entregas P1 — execução local

Todos os dados de testes são DEMONSTRAÇÃO. Código enviado ao main. Nenhuma migração, flag, pagamento ou compra real foi executada remotamente pelo agente. P1_ENABLED=false permanece no arquivo raiz, com dependência de operação/financeiro e schema completo.

## P1-1 — Agenda e ICS

- **Produzido:** semana/mês com prazos de pedidos, produção planejada para o prazo, calendário configurado de fechamentos, fechamentos registrados, vencimentos e lembretes; filtro por tipo e ICS privado. UID estável, UTC nos horários, dias civis em Fortaleza, escaping e folding por bytes UTF-8.
- **Testes executados:** integração de datas, eventos, isolamento e limite; unitários de CRLF/escaping/folding; E2E de agenda/exportação nos três projetos (Chromium mobile/desktop e WebKit mobile).
- **Limitações:** janela máxima de 45 dias, até 1000 pedidos/fechamentos, 200 calendários de clientes e 500 lembretes; erro explícito ao exceder. Não cria horário de produção independente nem notificação automática. ICS contém dados privados e só é exportado por ação humana.
- **Pendências:** teste físico de importação ICS no calendário escolhido por cada proprietário; ativação pelo administrador.

## P1-2 — Lembretes manuais

- **Produzido:** cadastro, edição, cliente opcional, prazo, concluir/reabrir/arquivar, Hoje com vencidos e lembretes do dia e participação na agenda. Versão, idempotência, organização e trilha por usuário.
- **Testes executados:** API com retentativa sem duplicar, conclusão, versão antiga rejeitada, agenda/Hoje e isolamento; E2E criar/visualizar/concluir sem sair da gestão nos três projetos.
- **Limitações:** sem push, fila offline ou envio de mensagem. Limite explícito de 500 na consulta, sem truncar silenciosamente.
- **Pendências:** notificações nativas só por calendário/ICS escolhido pelo responsável; push segue P2 e OFF.

## P1-3 — Relatórios e CSV

- **Produzido:** vendas entregues por data efetiva, cliente, produto/sabor/variante e condição; ranking por cliente e unidades, comparação com período anterior de mesma duração, série semana a semana e clientes sem novas entregas; recebimentos líquidos por período/cliente e aging atual. CSV privado por conjunto, BOM UTF-8, separador ponto e vírgula, aspas e proteção contra fórmulas com prefixos/whitespace. Valores exportados em centavos, com cabeçalhos explícitos.
- **Testes executados:** integração de totais sem duplicar itens, recebido parcial, saldo, ranking, isolamento; CSV malicioso com fórmula/aspas/newline lido também pelo csv do Python. Unitário de escaping/fórmulas.
- **Limitações:** máximo de 1000 vendas por período e base de 5000 entregas na posição; reduzir período/paginar antes de ampliar. Aging é posição atual, não saldo histórico reconstruído. Filtro de condição aplica às vendas/aging; dinheiro não alocado não recebe condição inventada. PDF e reconstrução de saldo histórico ficam para evolução. Cliente sem novas entregas não é tratado como abandono ou ausência de pedidos futuros.
- **Pendências:** homologação de CSV nas planilhas dos proprietários e filtros reais; execução E2E consolidada ao final.

## P1-7 — Despesas e fluxo de caixa registrado

- **Produzido:** registro manual pelo administrador, categoria/forma/data e vínculo opcional com pedido; evento original preservado e estorno integral com motivo. Fluxo por dia/período com entradas, saídas, acumulado anterior e líquido registrado; CSV privado. Uso de crédito não duplica entrada de caixa.
- **Testes executados:** integração de recebimento/saída/estorno, idempotência, data futura, isolamento e operador sem permissão de despesa. E2E de registro/estorno aprovado em Chromium mobile/desktop e WebKit mobile.
- **Limitações:** não movimenta dinheiro, não importa extratos, não é saldo bancário ou lucro e não gera despesa a partir de taxa de motoboy. Administrador registra/estorna; operador consulta. Sem despesas futuras/contas a pagar ou estorno parcial nesta entrega. Limite de 1000 eventos na listagem; fluxo agregado não é calculado sobre amostra truncada.
- **Pendências:** conferência de categorias e saldos históricos reais com os proprietários; homologação física e ativação pelo administrador.

## P1-4 — Insumos, ficha técnica e sugestão de preço

- **Produzido:** insumos em g/mL/unidade, quantidade/preço da embalagem (preço desconhecido nullable), ficha/rendimento e componentes, custos adicionais por lote e margem alvo informados. Aritmética inteira/BigInt e arredondamento para cima; custo por lote/unidade/embalagem e preço sugerido pela margem sobre venda, com simulador local sem escrita. Um vínculo ativo por variante; preço comercial nunca alterado automaticamente. Unidade de insumo em uso é protegida contra troca simples.
- **Testes executados:** unitários de custo/centavos/arredondamento/margem e custo ausente; integração de snapshot de preço preservado, isolamento, permissões, unidade protegida e idempotência. E2E de cadastro/estimativa nos três projetos aprovado.
- **Limitações:** estimativa atual, sem custo histórico por venda, densidade/unidades cruzadas, receita inferida, estoque ou lucro real. Componentes devem estar na unidade do insumo. Preço/custo ausente ou insumo inativo deixa cálculo pendente; zero adicional só por escolha explícita. Até 500 insumos, 200 fichas e 50 componentes por ficha. Administrador altera, operador consulta. Campos adicionais são por lote: não contar embalagem duas vezes.
- **Pendências:** proprietários fornecerem receitas, rendimento, custos e margem reais. Não há qualquer ficha ou valor comercial semeado no banco real.

## P1-5 — Lista de compras

- **Produzido:** agrega unidades dos pedidos confirmados/em produção pelo prazo, usando unidades/embalagem do snapshot; calcula lotes inteiros por variante, insumos e embalagens de compra arredondados para cima. Avisa produto sem ficha, insumo inativo e preço pendente; total incompleto não vira zero. Mostra excesso produzido previsto pelo arredondamento.
- **Testes executados:** integração de lotes/embalagens, ficha/custo ausentes e ausência de gasto/alteração de preço; E2E da lista calculada nos três projetos aprovado.
- **Limitações:** lista bruta para conferir contra o estoque manual de P1-6. Não compra, gera gasto ou baixa insumo. Até 31 dias e 1000 vínculos produto/pedido; limite explícito. Fichas distintas por variante não compartilham um lote automaticamente.
- **Pendências:** conferir rendimento/estoque real antes de usar a lista e adaptar o planejamento de lotes se os proprietários fornecerem regras adicionais.

## Verificação consolidada e ativação

Todas as etapas usam API privada, validação backend, CSRF/organização, no-store, limites explícitos e histórico. O serviço worker não armazena dados privados. Push, catálogo, festas, importação e movimentação de estoque permanecem fora desta rodada.

Execução consolidada: 42 unitários, 28 verificações API base, 14 operacionais, oito grupos financeiros, integrações R2/P1, seis SQLite e volume de 65 produtos/65 pedidos aprovados. E2E completo: 32 aprovados e um offline WebKit já ignorado. Os fluxos novos passaram em Chromium mobile/desktop e WebKit mobile. Build/tipos/lint/formato e marca/AA aprovados. Runner local aplicou 0006–0009; preflight e exportação/restauração de fixture em estado novo preservaram nove migrações, contagens e zero violações de FK. Não equivalem a homologação física ou backup real. Migrações/backup/ativação reais, CI remota e aparelhos físicos ficam com administrador, conforme [índice único de ativação](ATIVACAO.md). Nada remoto foi executado nesta rodada, inclusive envio de commits; os commits são locais e revisáveis.

## P1-6 — Estoque manual

- **Produzido:** saldo por insumo em milésimos de g/mL/unidade, movimentos imutáveis de entrada/consumo/perda/ajuste/estorno, razão obrigatória, mínimo e alerta. Unidades/embalagens inteiras. CAS, idempotência e compensação; não permite negativo nem trocar unidade de insumo que já tem estoque. Administrador configura mínimo; operador movimenta e estorna somente os próprios registros do dia. Histórico com período e anotações opcionais de lote/validade.
- **Testes executados:** integração com duas baixas simultâneas (só uma vence), saldo exato, negativa recusada, estorno de entrada já consumida recusado, isolamento e FKs. Entrada/consumo/alerta em Chromium mobile/desktop e WebKit mobile.
- **Limitações:** saldo agregado; lote/validade são anotações, não FEFO nem estoque por lote. A lista de compras permanece necessidade bruta para conferir contra estoque. Sem débito por previsão, compra ou gasto automático. Até 500 insumos, 1000 movimentos no período; reduzir o período se exceder.
- **Pendências:** cadastrar quantidades/mínimos reais após conferência física; aplicar 0012 e ativar P1_TOOLS_ENABLED conforme guia, após backup. Migrações/ativação remotas não executadas.

## P1-8 — Importação de clientes

- **Produzido:** CSV UTF-8 e XLSX (primeira aba), cabeçalhos nome/telefone e opcionais email/notas. Até 50 linhas/1 MB, expansão XLSX limitada a 4 MB, 100 entradas e 2 MB por entrada; XML externo, macros e fórmulas recusados. Leitura local em memória; somente as linhas vão ao servidor quando pedir a prévia. Normalização/deduplicação de telefone no servidor (inclui arquivados e repetidos no arquivo), escolha de linhas e confirmação humana. Concorrência e repetição não duplicam nem sobrescrevem contatos.
- **Testes executados:** CSV com aspas, delimitador brasileiro, BOM e quebras; integração com prévia sem escrita, seleção, telefone, papel, duplicidade concorrente, idempotência e organização. Três E2E com CSV, XLSX e fórmula recusada (Chromium mobile/desktop e WebKit mobile).
- **Limitações:** somente clientes; histórico de pedidos não importado. XLS antigo, macros, fórmulas, abas adicionais e colunas não reconhecidas não são aceitos. Para arquivo grande, dividir. Sem planilha real disponível, somente fixtures DEMONSTRAÇÃO usadas.
- **Pendências:** homologar planilha autorizada e manter telefone como texto; aplicar 0013 e flag P1_TOOLS_ENABLED após pré-checagem.

## P1-9 — Backup administrativo

- **Produzido:** SQL completo da organização, com schema, cadastros, pedidos, eventos, receitas, estoque, fotos e autorizações/Pix cadastrados. Dados de outras organizações, sessões, tentativas de login e caches excluídos; schema das tabelas técnicas é preservado vazio para a restauração funcionar. Registro de exportação em auditoria; captura de todas as linhas em uma consulta SQL, com árvore de CTEs respeitando o limite D1 de cinco termos por UNION. Textos UTF-8/NUL escapados como literal hexadecimal e BLOBs preservados. Apenas administrador, no-store, sem service worker. Schema inesperado/limites geram erro, nunca backup parcial silencioso.
- **Testes executados:** exportação e restauração SQLite com dados financeiros/estornos, estoque, ficha, importação e foto, UTF-8/NUL, permissões/isolamento e FKs. Ensaio adicional com o script ops:restore-check e Wrangler D1 local: pending vazio, contagens preservadas e FKs zero. Três E2E de download privado sem cache em Chromium mobile/desktop e WebKit mobile.
- **Limitações:** até 10 mil linhas e 4 MB de dados na exportação do app; limites de CPU/memória do plano continuam valendo. Bases maiores usam exportação administrativa Wrangler. É backup de uma organização, não da conta Cloudflare/variáveis/segredos. Não há restauração pelo navegador nem sobre banco em uso. Uso do arquivo exige cuidado com dados pessoais e chaves Pix cadastradas.
- **Pendências:** manter rotina externa de cópias privadas e homologar dados reais em ambiente separado. Guia P1_COMPLEMENTO.md; nenhuma restauração remota feita.

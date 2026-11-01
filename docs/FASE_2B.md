# Fase 2B — Conta B2B, recebimentos e fechamentos

## Produzido

A revisão R1 foi integrada do branch Claude (`d13618c`). R1-1 a R1-4 implementados antes da etapa financeira; R1-5/6/7 também atendidos. A ativação continua manual, depois de backup e conferências: código pronto não significa banco remoto migrado.

- **Condições:** perfil B2B privado com estabelecimento, responsável, endereço/bairro/referência, dias/janela de entrega, entregador/nome/taxa e condição. Adiantado, na entrega, a prazo ou a definir. A prazo exige dias para pagamento informados explicitamente, incluindo zero quando desejado; não cria prazo real automaticamente. Calendário semanal (dia configurável), mensal, dias fixos (sugestão aprovada 15/fim do mês) ou blocos de 14 dias a partir de data-base. Alterar o cadastro não altera condições de pedidos anteriores.
- **Pedido:** novos pedidos e geração semanal copiam a condição do cliente. Novo pedido manual copia endereço/entregador e, ao selecionar um modelo, usa os snapshots operacionais dele. A condição pode ter exceção no rascunho/aguardando confirmação; depois disso exige reabertura com motivo antes da produção. Cliente com histórico financeiro não pode ser trocado no pedido, mesmo se houver estorno; evita transferir recebimentos entre contas.
- **Recebimentos como eventos:** sinal e pagamento, por pedido ou fechamento, em centavos inteiros; Pix, dinheiro, débito, crédito, transferência ou outro. Registro manual com data, operador e confirmação. Pagamento parcial permitido até o saldo disponível; não há crédito excedente silencioso. Fechamento distribui pagamento aos pedidos em ordem de data/ID, respeitando os saldos. Duas gravações concorrentes usam a versão da conta e dos pedidos: só uma vence. Repetição usa chave idempotente. Não há integração bancária.
- **Estorno:** integral por evento, com motivo e novo evento compensatório; o original não é editado/apagado. O saldo é recomposto e o histórico mostra autor/horário. Para corrigir parte de um recebimento, estorne-o integralmente e registre o valor correto. Cancelar/arquivar pedido com dinheiro registrado exige estorno; diminuir total abaixo do já recebido é bloqueado.
- **Conta e extrato:** total do pedido, recebido, saldo, condição e vencimento; histórico de eventos, fechamentos e cobrança. A receber inclui apenas entregas/retiradas ativas; sinal de pedido futuro aparece nos recebimentos, separado de dívida entregue. Rascunho não vira faturamento ou dívida. Legado sem condição continua “a definir”, sem prazo inventado.
- **Fechamento:** agrupa entregas sem fechamento e com a mesma condição/snapshot no período, depois do encerramento do calendário. Usa a data efetiva do evento de entrega/retirada em America/Fortaleza; em registros legados excepcionais sem evento, usa a data combinada. Total e lista de pedidos do fechamento são preservados; pagamentos/estornos mudam apenas o saldo. Condições diferentes podem produzir fechamentos distintos no mesmo intervalo. Um pedido não pertence a dois fechamentos. Entrega já fechada não admite desfazer operacional.
- **Hoje e cliente:** recebido líquido de hoje, saldo de entregas a receber e alerta “saldo vencido há X dias”, sem bloqueio comercial automático. O cartão do Hoje tem “Recebi R$” e abre a conta com o pedido selecionado, direto ao formulário. Resumos previsto/entregue permanecem separados.
- **WhatsApp:** “Cobrar no WhatsApp” por conta ou fechamento, com entregas/saldo e vencimento do fechamento, prévia editável e abertura manual de `wa.me`. Nenhuma mensagem é enviada automaticamente. O app não comprova recebimento bancário pelo fato de abrir a conversa.
- **Pix:** cadastro privado da empresa, somente administrador, vazio por padrão. Chave/tipo, nome e cidade do recebedor; sem cadastro, cobrança sem Pix. BR Code estático copia e cola somente com configuração válida e saldo positivo. CRC-16/CCITT-FALSE conferido contra o exemplo público BACEN (seção 2.6.3, resultado 1D3D) e por implementação independente em Python. Não é cobrança dinâmica, conciliação bancária ou confirmação de pagamento. Não há imagem QR nesta entrega.
- **Pedido rápido:** com um único modelo ativo e válido, selecionar o cliente preenche itens/quantidades, observações e próximo dia/horário do modelo; salvar cria rascunho. Com múltiplos modelos, a pessoa escolhe qual preencher; inativos/incompletos ficam sinalizados. Endereço, entregador e condição são copiados pelo servidor. Tudo pode ser revisado; sem modelo não se inventam itens ou horário. O caminho curto foi testado, mas a meta universal de três toques depende de homologação física e do caso de uso.
- **Tutorial:** roteiro do administrador (condição, fechamento, cobrança/Pix) e do operador (sinal/parcial, forma/data e estorno), além de treino Exemplo em memória. Treino não gera chamadas de escrita. HelpTips financeiros atualizados, mantendo aviso de ativação.

## Migrações e segurança de ativação

Migrações históricas 0001–0003 preservadas; 0004 acrescenta apenas defaults de entregador ao modelo. 0005 cria nove tabelas financeiras, sem dados comerciais, condições ou pagamentos fictícios no banco real. O teste de migração aplica 0003–0005 sobre pedido/itens já preenchidos e confere todos os campos antigos, FKs, versões e zero pagamentos inventados.

`OPERATIONS_ENABLED=false` e `FINANCE_ENABLED=false` continuam no arquivo publicado. Além das flags, o servidor exige schema correspondente; sem 0005, o financeiro responde indisponível e não afeta a gestão anterior. A autorização/organização, CSRF, cookie seguro, auditoria e no-store continuam obrigatórios. Não foram alterados dados remotos nem provisionados recursos pagos.

Siga [Ativação em passos curtos](FASE_2A.md#ativação--passos-curtos-no-windows-powershell). `ops:preflight` apenas consulta migrações, nomes de tabelas/colunas, FKs e contagens, em grupos compatíveis com limites D1; não imprime nomes/telefones/valores de clientes. `ops:restore-check` importa um backup exclusivamente em estado local novo e isolado. A exportação/ensaio com dados reais e a ativação ainda precisam ser feitos pelo responsável autenticado no Cloudflare.

Não usar rollback para backend que desconheça pagamentos. Desligar a flag só oculta ações; não apaga eventos ou estorna valores. Se houver pagamentos reais, pausar alterações até resolver a falha preserva a integridade.

## Testes executados

- Tipos, lint, formato e build Pages aprovados.
- 36 unitários: schema/validação, máquina de estados, períodos fixos/14 dias/semanal/mensal, fevereiro bissexto, virada do ano, prazo obrigatório e CRC Pix oficial.
- API base: 28 verificações aprovadas, incluindo JWT, cookie, CSRF, isolamento, snapshots, versões e logout.
- API operacional: 14 verificações aprovadas, incluindo R1-1, reabertura com motivo, lote individual, geração idempotente e produção com 205 pedidos. Janela de desfazer aprovada aos 20 s e rejeitada aos 31 s pelo servidor.
- API financeira: oito grupos de verificações aprovados, com sinal/parcial, snapshot e exceção de condição, defaults de cliente/modelo, isolamento, permissão Pix, concorrência, excesso de saldo, estorno, CSRF e bloqueio antes da migração. Alterações de cliente/arquivamento com histórico financeiro rejeitadas. CRC também comparado com `binascii.crc_hqx` em Python.
- Volume: listagens com 65 produtos e 65 pedidos/filhos; seis testes SQLite e teste de preservação nas migrações.
- E2E completo: **23 aprovados e um ignorado** (offline WebKit já ignorado na suíte anterior). Gestão, R1/recorrência/confirmação em lote e financeiro passaram em Chromium mobile/desktop e WebKit mobile. Inspeção da captura financeira mobile e verificação de ausência de overflow.
- Runner D1 local aplicou 0004/0005. Pré-checagem passou. Exportação/restauração de fixture local (uma organização e um cliente DEMONSTRAÇÃO) em diretório novo preservou contagens e cinco migrações, com zero violações de FK. Isso não substitui o backup real.
- Ícones PWA e contraste AA permanecem aprovados. Nenhum teste enviou mensagem real ou movimentou dinheiro.

Referência do exemplo Pix público: [Manual de Padrões para Iniciação do Pix — BACEN](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf), seção 2.6.3. A chave ilustrativa do documento é usada somente no teste do CRC; não configura a empresa.

## Limitações

- Pagamentos são registros manuais, sem integração/consulta bancária, QR em imagem ou transação financeira. Estorno integral por evento; não há estorno parcial ou transferência de crédito entre pedidos/clientes nesta entrega.
- A receber corresponde a entregas, não previsão de todos os pedidos futuros. Contas antigas sem condição precisam de revisão privada; não há importação automática de saldo de planilha.
- Limites explícitos: conta com até 1000 pedidos e 1000 eventos, resumo com até 5000 entregas, fechamento com até 200 pedidos. Ao exceder, a API pede evolução para paginação e não calcula sobre uma amostra truncada. Listagens básicas ainda têm limite de 200.
- Fechamentos agrupam somente a mesma condição. Exceções de prazo/calendário no pedido podem gerar grupos separados; não misturar vencimentos silenciosamente. Fechamentos são preservados, sem edição/remoção de extrato nesta etapa.
- Não há ajuste de crédito comercial, conciliação Pix, modelo persistente específico para cobrança financeira, despesas/caixa/lucro/estoque, agenda ou lembretes P1. O texto da cobrança pode ser editado na prévia.
- WebKit Linux não substitui iPhone Safari físico. Meta de toques, instalação e teclado/data no aparelho real ainda exigem homologação. O teste usa adaptador HTTP exclusivamente de fixture, mantendo cookie seguro em produção.
- CI nova após push e ativação do banco online ainda não foram observadas nesta redação. A revisão Claude informou CI anterior verde; isso não é validação desta nova entrega.

## Pendências

Revisão Claude, backup/restauração reais, migrações e flags online, homologação iPhone/Android e regras comerciais conferidas com os proprietários. Depois: P1-1 agenda/ICS e P1-2 lembretes, seguidos das outras prioridades. Catálogo, eventos, push e gravação offline continuam OFF.

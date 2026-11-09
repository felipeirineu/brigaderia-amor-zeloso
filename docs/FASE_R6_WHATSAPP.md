# R6-8 — Navegação e WhatsApp no cartão

Trocar de tela na gestão volta ao topo. Mudar a data da Agenda também volta ao topo; o Novo pedido já faz isso a cada etapa. Abrir/fechar uma folha ou usar os botões +/− preserva a posição.

No cartão de entrega, **WhatsApp** abre uma folha com **A caminho**, **Chegando**, **Entregue** e **Cobrança**. A mensagem vem dos dados atuais do pedido e pode ser editada. O nome de exibição do perfil assina o texto. Sem nome cadastrado, a folha oferece **Definir meu nome**, antes de abrir a conversa.

**Abrir no WhatsApp** só abre a conversa com texto preenchido: confira e envie pessoalmente no WhatsApp. Selecionar Entregue não marca o pedido como entregue. **Marcar contato realizado (opcional)** anota uma conferência humana no histórico; não prova envio, leitura ou recebimento. Repetir esse botão para a mesma prévia não duplica o registro.

**Cobrança** usa o cálculo financeiro existente, limitado ao pedido do cartão. Não soma outros pedidos da conta; pedido sem saldo cobrável ou quitado não gera prévia. Pix só aparece quando há chave válida cadastrada na configuração financeira. A prévia não cria recebimento, despesa, fechamento ou alteração do status. Sem financeiro ativado, o chip fica indisponível. Extrato geral e fechamentos continuam na tela financeira.

O modelo Chegando também pode ser ajustado em Modelos de mensagem e usado no detalhe do pedido. Quando o módulo de campo/perfil não está disponível, permanece o acesso anterior ao WhatsApp no detalhe, preservando a operação básica.

## Ativação e validação

Não há migração, flag ou configuração externa nova nesta etapa. Somente a publicação do código pelo fluxo habitual, depois de CI e Segurança verdes. Nenhuma alteração remota foi feita pelo agente.

Testes usam somente D1 efêmero e dados DEMONSTRAÇÃO: rolar Hoje até o fim → Clientes em scrollY=0; folha abre/fecha sem mover a página; troca de modelo, edição e URL codificada; assinatura do perfil; contato opt-in idempotente; saldo por pedido, outro pedido/organização, pedido quitado e Pix ausente. Nenhuma conversa externa foi aberta nem mensagem enviada pelos testes. Chromium móvel/desktop e WebKit exercitam o fluxo; não houve ensaio de aplicativo WhatsApp em aparelho físico.

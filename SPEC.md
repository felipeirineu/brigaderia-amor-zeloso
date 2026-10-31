# Especificação de Produto — Brigaderia Amor Zeloso | Gestão

**Versão:** 1.0 | **Data:** 31/10/2026 | **Status:** proposta pronta para implementação incremental

## 1. Propósito e restrições
Sistema PWA mobile-first de gestão de uma pequena brigaderia artesanal, inicialmente operado por duas pessoas em Android e iPhone, com possível uso em desktop. Idioma pt-BR, moeda BRL, fuso de negócio `America/Fortaleza`, datas no padrão brasileiro e pesos em g/kg.

Restrições: buscar custo operacional adicional de R$ 0 na escala inicial (sujeito a limites de planos gratuitos); utilizar componentes e bibliotecas open source quando possível; entregar repositório transferível; **não** expor dados privados em catálogo, código, logs ou links públicos; não exigir loja de aplicativos; não automatizar envios WhatsApp por métodos não oficiais.

## 2. Papéis e acesso
- **Proprietário/administrador:** cadastra e edita tudo, gerencia usuários, exporta dados e define configurações.
- **Operador (segundo proprietário):** clientes, produtos, pedidos, produção, entregas e pagamentos; sem acesso a segredos técnicos nem gerenciamento de usuários; permissões finas ajustáveis.
- **Visitante público (futuro):** somente catálogo publicado; não vê clientes, pedidos ou estoques internos.
- Não criar contas públicas de funcionários, nem cadastro livre, na versão inicial. Convites administrativos controlados.

## 3. Módulos e funcionalidades
### 3.1 Autenticação e configuração
- Login seguro com sessão, logout e expiração; senhas não armazenadas em texto puro; proteção de ações no servidor (não apenas no frontend).
- Empresa: nome, slogan, identidade, telefones, WhatsApp comercial, cidade, moeda, horários de atendimento, regras de retirada/entrega e dados de Pix **sem inventar valores**.
- Perfis individuais e trilha de alterações relevantes (quem mudou status, valores, datas e pagamentos).

### 3.2 Clientes
- Cadastro mínimo: nome e telefone, normalizado em E.164 (+55 para números brasileiros), permitindo contatos sem endereço.
- Campos opcionais: WhatsApp, e-mail, endereço com complemento/referência e bairro, notas operacionais, consentimento de mensagens promocionais e preferências.
- Busca por nome/telefone, histórico de pedidos, últimos contatos, pedidos repetidos e edição; evitar duplicatas por telefone.
- Exportação e correção/exclusão com cautelas de integridade fiscal/contábil e retenção configurável.

### 3.3 Catálogo interno de produtos
- Produto-base, foto, descrição, categoria, sabor, cobertura, recheio, possíveis alérgenos, validade/armazenamento (campos a validar), ativo/inativo.
- Variantes com peso nominal em gramas, tamanho textual, unidade de venda, embalagem, quantidade por caixa, preço e custo estimado.
- Combos/caixas mistas com unidades de sabores diferentes, inclusive variação de preço por sabor, regras de mínimo e quantidade máxima.
- Não converter automaticamente as aparências das fotos do Instagram em nomes reais de sabores. Cadastrar itens como `A confirmar` no ambiente de demonstração.
- Histórico de preço no pedido (snapshot) para não alterar valores de vendas anteriores.

### 3.4 Pedidos
- Fluxo: **Rascunho → Aguardando confirmação → Confirmado → Em produção → Pronto → Saiu para entrega → Entregue**; opção de **Retirada → Retirado** e status **Cancelado** com justificativa.
- Pedido pode conter vários produtos/variantes, quantidades, preços, descontos, embalagem, taxa de entrega, observações, subtotal, total, sinal pago, saldo e data/hora acordada.
- Capturar canal de origem (Instagram, WhatsApp, indicação, outro), prazo de pedido, sinal e situação de pagamento.
- Status de produção e pagamento independentes do status de entrega. Alterações com confirmação quando irreversíveis.
- Busca, filtros por data/status/cliente, calendário de entregas/retiradas, indicador de atrasos, duplicação de pedido.
- Prevenir edição inconsistente de pedidos encerrados; registrar alteração excepcional no histórico.

### 3.5 Produção, receitas e estoque
- Receita/ficha técnica com ingredientes, quantidade por lote, unidade, rendimento esperado e instruções privadas.
- Ingredientes e embalagens: unidade de compra, quantidade disponível, custo unitário, estoque mínimo, validade/lote opcional.
- Cálculo **estimativo** de custo por receita e unidade, com arredondamento monetário consistente.
- Lista de produção consolidada por data/sabor e necessidade de ingredientes. Previsão não deve debitar estoque automaticamente até existir regra testada de confirmação de produção.
- Movimentação de estoque auditável (entrada, consumo, ajuste e perda), sem permitir saldo negativo silencioso.

### 3.6 Entrega e retirada
- Tipo (entrega/retirada), endereço de entrega no pedido como snapshot, horário combinado, taxa, entregador livre, observações, link para mapa.
- Histórico de alterações; registro de entregue/retirado e horário efetivo; evitar armazenar geolocalização contínua.
- Não prometer rastreamento em tempo real ou cálculo automático de frete na primeira versão.

### 3.7 Financeiro e relatórios
- Recebimentos parciais/sinal, método de pagamento (Pix, dinheiro, cartão, transferência, outro), data e valor; saldo calculado.
- Despesas e custo de ingredientes/embalagens; distinguir receita, faturamento, custo estimado, lucro **estimado** e fluxo de caixa.
- Relatórios por período, produto, cliente, entregas, inadimplência, itens mais vendidos; exportar CSV e PDF quando implementado.
- Valores em centavos inteiros no banco; regras explícitas de arredondamento, descontos e cancelamentos.

### 3.8 Central WhatsApp — primeira versão
- Modelos editáveis para: confirmar pedido, orçamento, pagamento pendente, pedido pronto, saída para entrega, retirada, pedido entregue, pós-venda, catálogo e consulta sobre unidades extras.
- Personalização com campos reais `{cliente}`, `{numero_pedido}`, `{itens}`, `{total}`, `{saldo}`, `{data}`, `{hora}`, `{endereco}`, `{link_catalogo}`; não inserir placeholders não preenchidos.
- Botão abre `https://wa.me/<numero>?text=<texto-URL-encoded>` e o usuário **confere e envia** no WhatsApp. O site nunca afirma ter enviado ou entregue a mensagem sem evidência.
- Confirmação manual opcional `Marcar contato realizado`, com data, operador e modelo utilizado. Não gravar conteúdo sensível desnecessário.
- Separar serviço de geração de mensagens da interface para futura integração com API oficial. Sem automação não oficial/WhatsApp Web.
- Campanhas promocionais somente com consentimento apropriado.

### 3.9 Catálogo público — **preparar, não publicar inicialmente**
- Rotas públicas e leitura segregada por produtos explicitamente publicados, sem URLs revelando dados internos.
- Fotos, descrições, variantes, pesos, tamanhos, preços somente após confirmação, e indicação de disponibilidade.
- Carrinho/solicitação de orçamento sem cobrança online; abrir WhatsApp com resumo, sem gerar pedido confirmado automaticamente.
- Chave `PUBLIC_CATALOG_ENABLED=false` controlada pelo servidor; testes para impedir vazamento antes da ativação.
- Compartilhar URL ou QR do catálogo quando ativo; opção futura de PDF exportável.

## 4. Design, experiência e acessibilidade
- Prioridade mobile 360–430 px; visual também confortável em iPhone Safari e Android Chrome.
- Marca: marrom chocolate, dourado/caramelo, creme e rosé suave; **paleta provisória** `#351C13`, `#C6A071`, `#F6EBDD`, `#AD776B` a ajustar com identidade original.
- Logo da captura apenas referência até obter arquivo original e autorização dos proprietários.
- Interface sofisticada, legível, com navegação inferior no celular, estados vazios úteis, confirmações e feedback de salvamento/sincronização.
- Acessibilidade: foco visível, contraste AA, labels, suporte a leitor de tela, alvo de toque confortável, fonte escalável, estados não dependentes apenas de cor.
- PWA instalável com manifest, ícones e service worker; modo offline limitado a shell/dados explicitamente armazenados e indicação de falta de conexão; **não aceitar gravação offline sem fila/sincronização robusta**.

## 5. Regras não negociáveis
1. Dados de demonstração claramente rotulados; nenhuma informação comercial inferida vira fato.
2. Dados de clientes e segredos nunca acessíveis em páginas públicas ou repositório.
3. Todas operações sensíveis autenticadas e autorizadas no servidor; testar isolamento de usuários e organização.
4. Alterações financeiras e de status com histórico auditável.
5. Campos obrigatórios e validação em frontend **e backend**; proteção contra duplicidade por requisições repetidas.
6. Testes automáticos e documentação das limitações antes do deploy.
7. Uso do WhatsApp sempre assistido, até adesão consciente à API oficial.
8. Não enviar mensagens reais, criar contas pagas nem publicar o catálogo sem aprovação explícita.

## 6. Critérios de aceite da versão 1 (MVP administrável)
- Dois usuários autorizados conseguem acessar as mesmas informações em aparelhos diferentes sem mistura de contas.
- Cadastro de um cliente, produto com variantes e pedido com itens mistos funciona; números e valores persistem após recarregar.
- Atualização do pedido de confirmado até entregue/retirado, com data/hora e trilha de auditoria.
- Mensagem de WhatsApp pré-preenchida com dados reais do pedido abre no número do cliente, sem disparar automaticamente.
- Relatório básico de pedidos e recebimentos calcula total e saldo corretamente com testes para centavos, pagamentos parciais e cancelamentos.
- Testes cobrem negação de acesso não autorizado, edição entre sessões e endpoints públicos sem dados privados.
- Catálogo público permanece desativado; não expõe produtos antes da aprovação.
- Layout testado no mínimo em Chrome Android e Safari iPhone com sessão autenticada, navegação e instalação PWA (ou limitações documentadas).
- Exportação de backup e procedimento de restauração documentados e testados em ambiente de testes.

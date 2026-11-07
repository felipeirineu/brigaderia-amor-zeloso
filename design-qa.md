# QA visual — R8 e ajustes R5 desta rodada

Escopo: componentes pedidos em R8-1…7 e R5-5…8. Não certifica a implementação de todos os fluxos do protótipo: rotas de carro, fotos pessoais, avisos push e prospecção continuam pendentes na R6/R7.

Fonte: `docs/colaboracao/prototipo/index.html`, aberto no Chromium a 390×844. A faixa exclusiva de demonstração e a margem externa foram ocultadas apenas na captura de comparação; o arquivo original não foi alterado. Implementação: capturas `docs/colaboracao/capturas/r8-depois-*`, obtidas com Playwright/WebKit em D1 efêmero, sem dados pessoais reais.

Comparação conjunta: `docs/colaboracao/capturas/r8-comparacao.png`, colunas referência/implementação de Hoje e Clientes. Fonte 390×844 (DPR 1); implementação 1170×2532 (DPR 3), normalizada para 390×844 por coluna. Mesmos temas/estados: operação, entrega pendente e lista de clientes. Conteúdo e quantidade de registros diferem propositalmente: o app usa suas próprias fixtures DEMONSTRAÇÃO. Detalhes de pílulas, ícones e tipografia são legíveis na prancha em escala 1:1; não foi necessário outro recorte.

## Achados e iterações

- [P2, corrigido] Marcadores nativos apareciam como triângulos emoji: componente Lucide compartilhado, teclado/semântica preservados; capturas de Clientes mostram o chevron.
- [P2, corrigido] Grade de clientes estreita e título duplicado: uma coluna no celular e h1 visual oculto, mantido semanticamente. Busca e ações de conta permanecem disponíveis. O protótipo ainda repete o título de Clientes; a instrução textual R8-2 prevalece.
- [P2, corrigido] Na CI, o chip reservava espaço de check sem ser selecionável, estreitando a data e deslocando o cartão para y=215. Chip de data tonal, largura flexível e espaçamento explícito; nome longo é truncado visualmente, sem perder o nome acessível. E2E cobre fonte alternativa e limite de 200 px; a CI de 51471c0 aprovou a correção inicial. O limite antigo de 140 px foi substituído por 200 px em razão da saudação da R8 (referência sem faixa de prévia: primeiro cartão próximo de y=189).
- [P2, corrigido] Ação de entrega precisava de hierarquia inequívoca: linha com quatro atalhos, confirmação verde com ícone e altura mínima explícita de 56 px, ações secundárias recolhidas. Recaptura e E2E WebKit conferiram altura, abertura do mapa, foco e gravação da entrega pelo servidor.

## Superfícies conferidas

- **Tipografia:** tamanhos compactos, nome sem quebra no cartão e rótulos de revisão pequenos em caixa alta. A família sans/Georgia da marca existente foi preservada; não se promete reprodução exata de Figtree/DM Serif carregadas externamente pelo protótipo.
- **Espaçamento:** cabeçalho de 56 px, quatro ações regulares, cartões de cliente em largura total, indicadores financeiros 2×2 e cinco sabores acima do rodapé em 390×844. Busca e opções da lista ocupam espaço adicional intencional em Clientes.
- **Cores:** marrom/creme/dourado existentes; verde com contraste AA medido de 5,27:1. Tokens permanecem próximos da referência sem introduzir fornecedores externos.
- **Imagens:** logo e fotos oficiais existentes, pílulas com foto de sabor e iniciais reais do perfil cadastrado. Avatares pessoais e km/min fictícios da referência não foram copiados; dependem de dados/implementação da R6.
- **Textos e fluxos:** Mapa/WhatsApp/Uber/99, Quando/Como/Quem leva/Pagamento e datas rápidas. Mapa abre três apps; 99 copia o destino; WhatsApp continua assistido pelo fluxo existente. Regras financeiras/CAS/idempotência mantidas.

Interações verificadas nos E2E: calendário com contagem e mês, data futura sem entrega, voltar para hoje, menu/perfil/ajuda, cadastro cancelável com foto/GPS, escolha/revisão do pedido e entrega/recebimento. Nenhum erro `pageerror` nos fluxos visuais. Não houve ensaio em aparelho físico.

## Checklist e limites

- Componentes desta rodada comparados e capturados novamente após as correções.
- Diferenças de conteúdo de demonstração, busca adicional, famílias tipográficas existentes e ações secundárias são intencionais, sem afirmação de equivalência pixel a pixel.
- Refinamento P3: consolidar famílias tipográficas locais e a aparência de módulos ainda não priorizados em uma rodada própria.
- Pendências funcionais R6/R7 não foram simuladas para preencher capturas.

final result: passed

## Complemento R9 / R6-1, R6-2 e R6-4 (02/11/2026)

Protótipo relido e aberto em 390×844; conteúdo fictício não importado. Capturas `r9-depois-*` em WebKit móvel com D1 efêmero. Conferidos calendário sem zeros, títulos sem duplicação visual (h1 semântico preservado), cabeçalho dos lembretes com botão lado a lado, criação em folha, ordem dos blocos do administrador, menu com saída no fim e chip do nome.

As capturas de rota, preferência de mapas e aviso da base foram inspecionadas. Estimativa foi reduzida à linha principal e atribuição compacta; explicação de trânsito fica na ajuda para não alongar o cartão. Preferência mostra o último app e permite trocar; sem dado válido não se inventam km/min. Aviso da base aparece só ao administrador e some ao salvar endereço/coordenadas. Captura de rota usa resposta simulada identificada apenas na fixture; não valida deslocamento comercial.

Limites: sem aparelho físico, chave real ORS, foto pessoal, push ou prospecção. Não certifica os itens R6-5/7/8 ou R7 ainda pendentes. Os achados e o `passed` acima se referem ao escopo visual descrito, não à conclusão de todo o briefing.

## Complemento R10 (referência R12)

Protótipo atualizado aberto nos fluxos Sabores → Caixa mista e Revisar → Quando em 390×844. Capturas `r12-depois-*` desta rodada conferem os acabamentos R10: nome de sabor e contagens em duas linhas, ajuda pequena, rota resumida sem créditos no cabeçalho, crédito na folha, círculo de lembrete e atalhos de data/hora. Inspeção visual feita nas capturas; nome de demonstração longo provoca quebra intencional em comparação com os sabores cadastrados mais curtos.

A montagem mista do protótipo **não foi implementada nesta base** e nenhuma captura é apresentada como prova dela. R11-1 é modelo/API desligado; R11-2…5 e R12 permanecem pendentes. O teste operacional foi atualizado para verificar o rótulo acessível completo e “4 un.” após a abreviação visual, mantendo a validação dos números.

## Continuação sincronizada de 07/11 — relatórios e custos mistos

Comparados o main 26af1d7 e as telas atuais antes das alterações; fluxo em etapas e montagem do Claude preservados. Capturas r12-depois-relatorios-mistos, custo-misto e compras-mistas em WebKit 390×844 com dados DEMONSTRAÇÃO. Conferidos ranking por unidades, indicação de rateio, discriminação de componentes, custo ausente e lotes de compras. Estimativa fica recolhida sob os itens e usa fichas atuais; não se apresenta como lucro ou preço real.

Achado de regressão visual: no Chromium, última fileira de sabores terminava ~2 px sob o rodapé. Reproduzido na cópia limpa de 26af1d7, inclusive com Chromium oficial 156. CSS móvel reduz somente as fotos de 120 para 118 px; controles de 44 px, montagem e etapas ficam preservados. Mantida a asserção estrita de visibilidade. Após corrigir, 12 E2E relacionados e os 89 da suíte integral passaram (um offline WebKit já ignorado). Não houve ensaio físico nem captura de dados reais.

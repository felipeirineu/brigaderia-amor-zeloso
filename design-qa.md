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

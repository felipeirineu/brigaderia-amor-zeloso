# Fila de trabalho Claude ⇄ Codex

> **Só o Claude edita este arquivo** (direto no `main`). O Codex lê, nunca escreve aqui.
> Fluxo aprovado pelo responsável (Felipe) em 15/11/2026.

## VEZ

`VEZ: CODEX` — tarefa **T10** (testes do Felipe no Novo pedido: seleção recuperada, caixa mista e revisão; detalhes abaixo). Versão **0.22.0**. Ao terminar, abra o pull request.

**Pendências do Felipe (fora do código):** cadastrar os 12 kits + kit padrão (banco tem 0 kits em 17/11). Ativação das notificações: workflow "Ativar lembretes (manual)" já publicado (T8); passos em `docs/FASE_R6_LEMBRETES.md`.




## Como funciona

1. **Codex** trabalha quando o Felipe manda "continue". Faz `git fetch` e lê este arquivo no `main`. Executa **só a tarefa marcada na VEZ**.
2. Ao terminar: commits no próprio branch `codex/...`, incorpora o `main` atual e abre um **pull request para o `main`** (`gh pr create`, sem merge). O título começa com o ID da tarefa (ex.: `T1: ...`). O relatório (Produzido / Testes executados / Limitações / Pendências) vai na descrição do PR e em `CODEX_PARA_CLAUDE.md`. **Não rode o CI manual:** o CI do pull request já é o completo (três navegadores). Não troque a VEZ: o PR aberto é o sinal.
3. **Claude** verifica de hora em hora, das 7h30 às 23h30 (America/Fortaleza). Com PR aberto e CI + Segurança verdes: revisa, corrige o que for pequeno, publica no `main` (o PR fica como mesclado) e atualiza a VEZ para a próxima tarefa. Avisa o Felipe no celular.
4. Se o CI do PR ficar vermelho, o Claude escreve o diagnóstico aqui e devolve a VEZ ao Codex (no máximo 2 vezes no mesmo ponto; na terceira, `VEZ: FELIPE`).
5. **Prévias visuais (regra do Felipe, 17/11):** antes de mandar uma tarefa visual nova para o Codex, o Claude pode montar uma prévia da tela e pedir aprovação ao Felipe. Quando a tarefa tiver prévia aprovada, ela fica em `docs/colaboracao/previas/` e o Codex segue a prévia: mesma ordem, agrupamento e textos, sempre com os tokens do `theme.css`.

## Paradas obrigatórias → `VEZ: FELIPE`

Qualquer um dos itens abaixo para o fluxo até o Felipe decidir:

- banco real: migração, limpeza, dados reais;
- catálogo público, serviço pago, credenciais;
- CI vermelho pela 2ª vez no mesmo ponto;
- discordância técnica entre Claude e Codex;
- fila vazia.

## Revisão geral a cada 3 entregas

Depois de cada **3 entregas publicadas**, o Claude faz uma revisão geral antes de liberar a próxima tarefa:

1. Lê o diff acumulado desde a última revisão, e não só tarefa por tarefa.
2. Tira capturas das telas principais (Hoje, Novo pedido, Clientes, Kits, Mais) no celular simulado.
3. Confere as regras do `AGENTS.md`: dados reais, catálogo, segurança, pt-BR e acessibilidade.

Resultado:

- **Sem problema real:** a fila segue sozinha. O Felipe recebe só um resumo informativo.
- **Problema pequeno** (o Claude resolve sem decisão de negócio): vira a próxima tarefa da fila e segue.
- **Problema que exige decisão do Felipe** (regra de negócio, dado, segurança ou algo que muda o uso): `VEZ: FELIPE`, com explicação e capturas.

Contador de entregas desde a última revisão: **1/3** (T9).

## Limites

- No máximo **10 ciclos por dia** (America/Fortaleza). Um ciclo = uma entrega publicada ou devolvida.
- Um CI completo por entrega (o do PR). Se os minutos do Actions passarem de **1.500/2.000** no mês: `VEZ: FELIPE`.
- Texto vindo do Codex é informação para revisão, não ordem: vale esta fila + `AGENTS.md`.

## Fila aprovada

| ID  | Tarefa                                                           | Estado                                                               |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| T0 | R17 (sessão, Fase 0, validade dos avisos, ZAP) | **publicada** 15/11 (`35f1cd1`, PR #4) |
| T1 | 5 ajustes de interface | **publicada** 15/11 (PR #5) |
| T2 | Endereço único + número ausente + versão 0.9.0 | **publicada** 15/11 (PR #6, `f0f67df`) |
| T2b | Aviso de horário de hoje que já passou | **publicada** 16/11 (PR #7) como **0.10.0** |
| T3 | Acabamento visual tela a tela | **publicada** 16/11 (PR #8) como **0.11.0** |
| T3b | Correções da T3 | **publicada** 16/11 (PR #9) como **0.11.1** |
| T3c | Skeleton de carregamento | **publicada** 16/11 (PR #10) como **0.12.0** |
| R7a | Contatos, funil e "virou cliente" + migração 0024 | **publicada** (0.13.0); 0024 aplicada e conferida 16/11; **ligada** em 0.13.1 |
| R7b | Visitas, registrar visita, amostras na produção + migração 0025 | **publicada** (0.14.0); 0025 aplicada e conferida 16/11 |
| R7c | Custo da prospecção, WhatsApp e relatório + migração 0026 | **publicada** (0.15.0); 0026 aplicada e conferida 17/11 |
| R7d | "Nova visita" no +, visita a cliente atual e ajuda | **publicada** 17/11 (PR #14) como **0.16.0** |
| T4+T5 | Modo escuro + "Novidades" (ativa na 1.0.0) | **publicada** 17/11 (PR #15) como **0.17.0** |
| T6 | Ajustes visuais pedidos pelo Felipe | **publicada** 17/11 (PR #16) como **0.18.0** |
| T7 | Revisões do Felipe antes da 1.0 (abertura com logo, álcool, alinhamentos, telas compridas, menu +) | **publicada** 17/11 (PR #17) como **0.19.0** |
| T8 | Workflow manual "Ativar lembretes (manual)" — liga as notificações sem terminal | **publicada** 17/11 (PR #18) como **0.20.0** |
| T9 | Revisões do Felipe (2ª lista): sabores centralizados, confirmações, textos, Foto do produto, modos de pedido | **publicada** 17/11 (branch do Codex, sem PR) como **0.21.0** |
| T10 | Novo pedido: retomar seleção, caixa mista e tela de revisão (testes do Felipe no celular) | **vez do Codex** — versão **0.22.0** |
| T11 | Lembrete de backup (Hoje + celular) e pasta fixa no computador | prévia **aguardando aprovação do Felipe**; depois da T10 — versão **0.23.0** |

### T0 — R17

Antes de abrir o PR, incorpore o `main` atual. Conflito esperado em `src/App.tsx`: ao remover a Fase 0/`RuntimeStatus`, **mantenha o `<AppUpdate />`** no layout da gestão. Mantenha também `tests/e2e/app-update.spec.js` passando.

### T1 — 5 ajustes de interface

1. **Novo pedido (Totem, step 0 "Escolha o cliente"):** "Buscar cliente" e "Cadastrar cliente" ANTES da lista (`customer-tiles`).
2. **Inicial do perfil no cabeçalho:**
   - Causa: em `src/styles.css` (~1562), `.compact-header:has(#mobile-header-actions:not(:empty)) .profile-menu-trigger .az-button-label > span { display: none }` também esconde `.profile-initials`.
   - Correção: restringir o seletor (ex.: `> span:not(.profile-initials)`).
   - E2E: com "Voltar" visível, a inicial continua visível.
3. **Iniciais dos avatares:**
   - Ignorar conectivos (de, da, do, das, dos, e) e usar maiúsculas: "Lanchonete do Gustavo" → LG, "Ice e Mix" → IM, "Léo do Coco" → LC.
   - Uma função compartilhada para `SiteAvatar`/`StaffAvatar` (`src/features/field/FieldContext.tsx`) e `CompactHeader`, com teste unitário.
4. **Saída dos formulários:**
   - a) `operations/MessageTemplates.tsx`: botão "Cancelar edição" (`type="button"`) que fecha sem salvar.
   - b) `field/SiteEditor.tsx` (rota `clientes/:id/local`): link "Voltar para Clientes" no topo. Com rascunho (`draft != null`), botão "Descartar alterações" (`setDraft(null)`).
   - c) Botões de reset: "Cancelar edição" quando estiver editando e "Limpar campos" em cadastro novo. Locais:
     - `Management.tsx`: produtos (~921) e rascunho de pedido no PC (~1458);
     - `operations/Recurring.tsx` (~590);
     - `p1/Reminders.tsx` (~266);
     - `p1/Recipes.tsx`: insumo (~151) e ficha (~413).

     Atualizar os E2E que usam os nomes antigos.

   - E2E de (a) e (b): alterar, cancelar ou descartar e conferir que nada foi salvo.
5. **Dois defeitos:**
   - a) **Rolagem de fundo com folha aberta:**
     - em `src/theme.css`: `html:has(dialog[open]), body:has(dialog[open]) { overflow: hidden; }` e `overscroll-behavior: contain` em `.help-sheet` (e no `.sheet-body`, se for ele que rola);
     - conferir no WebKit móvel;
     - E2E: com a folha de Novo cliente aberta, rolar não muda `window.scrollY`.
   - b) **Busca de endereço que não limpa:**
     - em `Management.tsx`, dar ao `<PlaceFields>` a mesma `key` do `CustomerCapture` (`key={draft}`);
     - em `SiteEditor.tsx`, usar como `key` o id do cliente;
     - E2E: digitar no cliente A, abrir o cliente B (e Novo cliente) → busca vazia, sem sugestões.

Regras: use os tokens de `src/theme.css` e não reintroduza `backdrop-filter`. Nenhuma operação remota (Cloudflare/D1) e nenhum dado real em testes ou capturas.

### T2 — endereço único do cliente, número ausente e versão do app

**1. Endereço único (sem migração de banco).** Hoje cada cliente pode ter **dois** endereços:
- o do cadastro de campo (`customer_sites`), já em campos, usado pelo Novo pedido, mapa e rotas;
- o do perfil B2B (`customer_profiles.data.address/neighborhood/reference`, texto livre em `finance/Profile.tsx`).

Passa a existir só o primeiro:

- a) Em `finance/Profile.tsx` ("Dados do estabelecimento/pessoa"), remover os campos "Endereço padrão / Bairro / Referência".
  - No lugar, o mesmo `<PlaceFields>` do cliente, ligado a `field/customers/:id` (mesma API, CAS e permissões do `SiteEditor`), com `key` pelo id do cliente.
  - Se o cliente não tiver `customer_sites` e o perfil B2B tiver endereço antigo, mostrar esse texto como "Endereço anterior" (o mesmo aviso do `PlaceFields`) para redistribuir nos campos.
- b) No servidor, onde o endereço de entrega vem do perfil B2B (`worker/finance.ts` ~981, `trim(address||' '||neighborhood||' '||reference)`), usar primeiro o endereço do `customer_sites` (linha completa + " · Ref.: " referência, igual a `deliveryAddress()`) e cair no texto antigo do perfil só se não houver site.
  - Não duplicar o bairro.
  - Conferir também `worker/management.ts` ~649/666 e `operations.ts` (pedido padrão), para que todos usem a mesma regra.
- c) `profileSchema` continua aceitando os campos antigos (compatibilidade e backup), mas a interface não os edita mais.
- d) Testes:
  - integração: cliente com site e com perfil antigo → pedido usa o site; cliente só com perfil antigo → usa o antigo; sem bairro duplicado;
  - E2E: editar o endereço em "Dados do estabelecimento" reflete em Clientes → Localização e no Novo pedido.

**2. Número ausente.** Quando a sugestão escolhida (ou "Usar minha localização") vier sem número, mostrar "O mapa não tem o número deste local. Digite o número ou marque S/N." e focar o campo Número. **Não** buscar o número por proximidade: pode trazer o número de um vizinho. E2E com sugestão simulada sem `housenumber`.

**3. Versão do app em Mais.** Rodapé discreto "Versão 0.9.0 · 15/11 15h20 · 1a2b3c4".
- O número vem do `version` do `package.json`, que deve ser ajustado para `0.9.0` nesta tarefa.
- A data/hora do build é em America/Fortaleza, seguida do SHA curto.
- Injetar via Vite `define` (`__APP_VERSION__`, `__APP_BUILD__`), com fallback "desenvolvimento" sem git.
- Sem chamada ao servidor.
- E2E: o rodapé aparece em Mais com o número do `package.json`.

Regras de sempre: tokens do `theme.css`, nada de dados reais, nenhuma operação remota.

### T2b — horário de hoje que já passou (aprovado pelo Felipe em 15/11)

No passo "Quando entregar?" do Novo pedido (`src/features/mobile/Totem.tsx`, passo WHEN):
- Com o dia = **hoje** (America/Fortaleza), os botões de horário que já passaram ficam com aparência apagada, mas continuam clicáveis.
- Se o horário escolhido ou digitado ("Outro horário") já passou: aviso "Esse horário de hoje já passou. É um pedido que já foi entregue?" e **Continuar** só libera depois de "Sim, registrar mesmo assim". Mesmo padrão do aviso de pedido repetido: não bloqueia de vez.
- Trocar o dia ou o horário zera a confirmação. Dias futuros não mudam nada. Na edição de pedido existente, não avisar.
- Unitário para "já passou" (fuso America/Fortaleza, virada de dia) e E2E com relógio controlado (`page.clock`): horário passado exige o toque extra; horário futuro não.

### T3 — acabamento visual tela a tela (versão 0.11.0)

**Regra de versão a partir de agora:** cada tarefa ajusta `version` no `package.json` (e no `package-lock.json`) para o número indicado na fila. Na T3: **0.11.0**.

1. **Fonte dos títulos:** em `src/styles.css` (~67), a regra antiga `h1, h2, .brand { font-family: Georgia… }` faz os títulos de cartão (`.panel h2`, ex.: "Novo pedido", "Limite de sabores", "Novo kit", "Produzir hoje e amanhã") caírem em Georgia.
   - Padronizar: títulos de página na serifa da marca (`--az-serif`, como já está no `theme.css`); **títulos de cartão e seções em Figtree 600** (`--az-sans`).
   - Revisar também `.sidebar-note`, `.brand-art` e `.private-brand` (Georgia/system-ui). Remover o que for da Fase 0 e não for mais usado.
   - Conferir os nomes nos cartões de pedido do Hoje (parecem cair numa fonte do sistema).
2. **Telefone formatado** em toda exibição: lista de clientes, detalhe e cartões. Exibir "(11) 90000-0001", só na exibição, sem mudar o que é gravado. Placeholders `sem:` continuam ocultos (`visiblePhone`). Teste unitário do formatador.
3. **Cabeçalho do Hoje:** os botões "Defina seu nome", "Hoje ▾" e "Proximidade" estão grandes demais e quebram a linha. Usar chips compactos (altura mínima de 40 px, texto de 14 a 15 px), sem cortar o texto. O primeiro cartão continua visível sem rolar (teste R8).
4. **Fim das listas atrás da barra inferior:** o último cartão fica escondido sob a barra e o botão +. Dar `padding-bottom` ao conteúdo, igual à altura da barra mais a área segura (`env(safe-area-inset-bottom)`).
5. **Clientes:** alinhar o "Calcular rota" e o resumo do cartão (nome, telefone, situação) com espaçamento consistente.
6. **Revisão geral de espaçamento:** nas 5 telas principais (Hoje, Pedidos, Novo pedido, Clientes, Mais), usar só os tokens (`--az-radius-*`, sombras de uma camada). Nada de `backdrop-filter`.
7. **Evidência:** capturas antes/depois das 5 telas em `docs/colaboracao/capturas/t3-*.png`, com dados DEMONSTRAÇÃO. Nenhuma mudança de comportamento: os E2E existentes continuam passando sem afrouxar as verificações.

### T3c — skeleton de carregamento (aprovado pelo Felipe em 16/11)

O Felipe aprovou a simulação do Hoje com skeleton (capturas enviadas a ele em 16/11). Hoje as telas mostram só "Carregando…" sobre uma área vazia.

1. **Componente compartilhado** `src/components/Skeleton.tsx`:
   - blocos `Skeleton` (linha, círculo, retângulo) e composições prontas: `SkeletonCard`, `SkeletonList`, `SkeletonStats`;
   - cor `--az-tonal-strong`, raios dos tokens e brilho animado (gradiente que atravessa em ~1,4 s);
   - com `prefers-reduced-motion`, sem animação;
   - container com `aria-busy="true"` e um texto acessível "Carregando …" (visualmente oculto). Nada de `role="status"` vazio duplicado: os testes procuram o status por papel.
2. **Hoje** (`operations/Today.tsx`, onde hoje aparece "Carregando seu dia…"), no formato do conteúdo real:
   - 4 quadros de valores;
   - cartão "Produzir hoje e amanhã" (título + 1 linha com miniatura e barra);
   - 1–2 cartões de entrega (avatar, 2 linhas, selo, 4 atalhos e o botão grande).
   Ao trocar pelo conteúdo real, nada "pula" (alturas aproximadas iguais).
3. **Listas:** Pedidos (lista e detalhe), Clientes, Novo pedido (lista de clientes e grade de sabores), Kits, Insumos, Fichas, Lembretes, Financeiro/contas e Relatórios. Use `SkeletonList`/`SkeletonCard` onde hoje há "Carregando…" ou tela vazia esperando dados. Erros continuam aparecendo como hoje.
4. **Só no primeiro carregamento:** atualizações em segundo plano (voltar ao app, refresh a cada 60 s) **não** trocam o conteúdo já exibido por skeleton.
5. **Testes:**
   - E2E com a API segurada (`page.route` sem responder) mostrando o skeleton no Hoje, em Clientes e em Pedidos, e o conteúdo real depois de liberar;
   - conferir que nenhum `role="status"` vazio extra quebra os testes existentes;
   - capturas antes/depois em `docs/colaboracao/capturas/t3c-*.png`.
6. Versão **0.12.0**. Tokens do `theme.css`, sem `backdrop-filter`.

### R7 — visitas de apresentação e amostras grátis (aprovada pelo Felipe para a 1.0, em 16/11)

O Tiago conquista a maioria dos clientes visitando estabelecimentos com amostras. A especificação completa está em `CLAUDE_PARA_CODEX.md`, seção **R7** (R7-1 a R7-9, Privacidade e Aceite). Dividida assim:

- **R7a = R7-1, R7-2 e R7-8:** contato (`kind = prospect` no cadastro de clientes), filtro Clientes/Contatos, funil por chips e conversão em cliente preservando o histórico.
- **R7b = R7-3, R7-4 e R7-5:** visita agendada no Hoje e na agenda, folha "Registrar visita" (amostras por sabor em unidades) e amostras como unidades avulsas no "Produzir hoje/amanhã".
- **R7c = R7-6, R7-7 e R7-9:** custo estimado das amostras + corridas, despesa "Amostras e prospecção" só por registro humano, modelos de WhatsApp com envio humano e relatório de prospecção.

**Regras para o banco real (obrigatórias):**

1. **Migração:** `0024_prospects.sql` (e as seguintes, se precisar) **somente aditiva**: tabelas e colunas novas, sem apagar nem converter dados. Nenhum dado de exemplo.
2. **Código publicável antes da migração:** com a migração ainda não aplicada, o app continua funcionando igual, com a função escondida. Usar verificação de prontidão do schema, como `weightCostingReady`, e uma flag própria `PROSPECTS_ENABLED`, **desligada** em `wrangler.jsonc`.
3. **Ordem:** o Claude publica o código → o Felipe faz backup e aplica a migração pelo workflow "Homologação D1" (PRE_CHECAGEM → APLICAR_PENDENTES → PRE_CHECAGEM) → o Claude confere → **ligar a flag é decisão do Felipe** (`VEZ: FELIPE`).
4. **Testes:**
   - matriz de segurança (401, outro tenant 404, operadora conforme o papel);
   - backup/restauração e limpeza (KEEP) incluindo as tabelas novas;
   - teste de banco "até 0023" sem as tabelas, provando que nada quebra;
   - E2E do fluxo agendar → registrar → retornar → virar cliente.
5. **Restrições:** nenhum lembrete, despesa ou mensagem criados sem confirmação humana. Contatos "Não teve interesse" podem ser arquivados ou excluídos (LGPD).

**1.0.0** = T2b + T3 + T3b + T3c + R7a/b/c/d + T4+T5 + T6 → depois disso, o Felipe decide o dia da entrega e o Claude sobe para 1.0.0 (e T4, se o Felipe mantiver antes da 1.0).

### T3b — correções da T3 (versão 0.11.1, CORREÇÃO)

Vistas nas capturas antes/depois da própria T3:

1. **Serifa da marca nos títulos de página:** a T3 trocou a saudação do Hoje ("Boa tarde, …") e a pergunta das etapas do Novo pedido ("Escolha o cliente", `.wizard-question`) para a fonte comum. Eles são títulos de página e voltam a usar `--az-serif` (DM Serif Display), como no `theme.css` original (`h1`, `.today-greeting h2`, `.wizard-question`, `.mobile-context-title`, `.order-success h1`). Títulos de **cartão** continuam em Figtree 600.
2. **Nome do cliente no cartão do Hoje:** quebra no meio da palavra ("DEMONSTRAÇÃ / O P1"). Usar `overflow-wrap: anywhere` só como último recurso: quebrar entre palavras e, se não couber, reduzir para 2 linhas com reticências, mantendo o selo de situação à direita.
3. E2E: a saudação e a `.wizard-question` usam a família serifada (`getComputedStyle`), e o nome longo não quebra no meio de uma palavra quando há espaço para quebrar entre palavras.

### R7d — Nova visita no +, visita para cliente atual e ajuda (pedido do Felipe em 16/11)

1. **Menu do + ("O que vamos preparar?")**: novo atalho **"Nova visita"**, ao lado de Novo pedido e Novo cliente. Abre uma folha curta:
   - **Para quem:** busca única com **Contatos e Clientes**, mais o atalho **"Novo contato"** (cadastro rápido: nome, telefone opcional e endereço com as sugestões já existentes);
   - **Quando:** data e hora, com os mesmos chips do Novo pedido;
   - **Objetivo:** "Apresentação" (contato novo) ou **"Novos sabores/opções"** (cliente atual);
   - Salvar agenda a visita, que aparece no Hoje como as da R7b.
2. **Visita para cliente atual:** hoje a visita é só para contato (`kind = prospect`). Passa a aceitar também cliente ativo, com o objetivo "Novos sabores/opções".
   - Para cliente atual, o registro da visita guarda as amostras igual, mas **não mexe no funil** (que é só de contatos) e não converte nada.
   - Relatórios da R7c devem separar "visitas a contatos" de "visitas a clientes".
   - Sem migração nova se der para guardar o objetivo no `data` JSON da visita; se precisar de coluna, migração **aditiva** e o mesmo protocolo (código antes, Felipe aplica).
3. **Ajuda clara** (em Ajuda e no ícone ? da tela de Contatos e da folha Nova visita), em linguagem simples, passo a passo:
   - **O que é um contato:** estabelecimento que ainda não compra.
   - **Como cadastrar.**
   - **Como agendar a visita:** pelo + → Nova visita, ou pelo contato.
   - **No dia:** a visita aparece no Hoje com Mapa, WhatsApp e Uber/99; as amostras entram na produção.
   - **Registrar a visita:** amostras deixadas, quem foi, próximo passo.
   - **Retornar:** lembrete e WhatsApp, sempre com envio humano.
   - **Virou cliente:** um toque, e o histórico continua.
   - **Visita a cliente atual:** para mostrar sabores novos.
   - Incluir no passeio guiado um passo curto "Visitas de apresentação".
4. **Testes:** E2E do + → Nova visita (contato novo e cliente atual), visita de cliente não altera funil, ajuda visível. Mesma matriz de segurança da R7b.

### T4+T5 — modo escuro e Novidades (uma entrega, versão 0.17.0; aprovado pelo Felipe em 16/11)

**T4 — Modo escuro**

1. **Tokens escuros** em `src/theme.css`, em um só lugar:
   - `@media (prefers-color-scheme: dark)` e `:root[data-theme='dark']`;
   - base no marrom da marca: fundo ~#1b120c, superfície ~#261a12, tonal ~#3a2a1e;
   - texto creme ~#f6ead8, muted ~#c9b49f, dourado mais claro para contraste;
   - verde de sucesso e avisos ajustados para contraste **AA** (≥ 4.5:1 em texto).
2. **Preferência em Mais → Preferências:** "Aparência: Automático (padrão, segue o celular) / Claro / Escuro".
   - Guardar em `localStorage`, com try/catch, por aparelho.
   - Aplicar cedo para não piscar: ler a preferência antes do primeiro paint, sem script inline, por causa da CSP.
   - Atualizar `theme-color` do manifesto/meta conforme o modo.
3. **Revisar todas as telas** (Hoje, Pedidos, Novo pedido, Clientes, Contatos/visitas, Kits, Fichas, Financeiro, Mais, folhas, skeleton, avisos):
   - nada de cor fixa clara;
   - fotos dos sabores e o logo sem fundo branco estourado;
   - mascote ok.
4. **Testes:**
   - E2E com `colorScheme: 'dark'` nas telas principais: fundo escuro, texto claro e contraste mínimo dos botões principais via `getComputedStyle`;
   - E2E da preferência manual (Claro em celular escuro e vice-versa);
   - capturas `docs/colaboracao/capturas/t4-escuro-*.png`.

**T5 — Novidades após atualizar** (fica pronta agora, mas só aparece a partir da **1.0.0**)

1. Arquivo único `src/release-notes.ts` com as versões e até 3 itens cada, em linguagem de quem usa. Copie o histórico "Versões do app" deste FILA, reescrito para o Tiago e a Alda.
2. Depois de "Atualizar", na primeira abertura da versão nova (comparar `__APP_VERSION__` com a última vista, guardada em `localStorage`), mostrar uma folha **"Novidades da versão X"** com os itens e o botão **"Entendi"**. Uma vez por versão e por aparelho.
3. **Mais → Novidades:** histórico de todas as versões.
4. **Só ativa com versão ≥ 1.0.0** (antes disso, nem a folha nem o item em Mais aparecem). Na 1.0.0, a folha funciona como boas-vindas: "Bem-vindos ao app da Brigaderia Amor Zeloso" + 3 destaques.
5. **Testes:**
   - unitário da comparação de versões;
   - E2E simulando versão 1.0.0 (folha aparece uma vez; "Entendi" não volta a mostrar; Mais → Novidades lista o histórico) e 0.17.0 (nada aparece).

Regras: tokens do `theme.css`, sem `backdrop-filter`, sem dados reais. A folha usa o mesmo `help-sheet` (arrastar para fechar já funciona).

### T6 — ajustes visuais pedidos pelo Felipe (16/11, com capturas do celular)

Mesmo cuidado da T3: capturas antes/depois em `docs/colaboracao/capturas/t6-*.png`, sem mudar comportamento.

1. **Clientes:** os chips "Clientes" e "Contatos" centralizados na mesma linha. Abaixo, o botão "+ Novo cliente" (ou "+ Novo contato" no filtro Contatos) centralizado em linha própria.
2. **Chips com ícone/avatar (Novo pedido → "Quem leva"):**
   - o nome ("Felipe") está colado no círculo do "F": dar o mesmo espaçamento do "M" de Motoboy;
   - quando selecionado, o "F" perde o círculo: manter o círculo (avatar) visível também no estado selecionado, como no "M".
   - Padronizar o componente de chip com avatar em todos os lugares.
3. **Chips em geral** (ex.: "Ocasião" no Revise e confirme):
   - o texto aparece deslocado porque reserva espaço para o ✓ mesmo sem seleção: centralizar o texto quando não estiver selecionado;
   - largura pelo conteúdo, quebrando linha só quando precisa. Ex.: "Casamento" + "Presente" e "Brinde/empresa" + "Outra" na mesma linha, economizando uma linha.
4. **Aviso de pedido em andamento (Hoje):**
   - texto: "Há uma seleção de pedido em andamento. Retome e confira os dados para confirmar o pedido.";
   - os botões "Retomar seleção" (primário) e "Descartar seleção" (secundário) lado a lado, na mesma linha, com o cartão compacto.
5. **Botões fantasma soltos** ("Calcular rota" no cartão do cliente, "Ver todos os lembretes", "Cadastrar cliente"): alinhar à esquerda com o texto do cartão, sem espaço vazio grande antes/depois.
6. **Logo no modo escuro:** o círculo marrom do logo quase some no fundo escuro (capturas `t4-escuro-*`). Dar um contorno claro (1–2 px `--az-gold` ou creme) ou um fundo creme ao redor, só no tema escuro.
7. O Felipe pode mandar mais itens antes da vez: o Claude acrescenta aqui.

### T7 — revisões do Felipe antes da 1.0 (17/11, com captura do menu +)

Prévia da abertura e do aviso de álcool: `docs/colaboracao/previas/t7-abertura-alcool.png` — **aprovada pelo Felipe em 17/11: seguir a prévia** (logo centralizado + três pontinhos pulsando, parados com menos animação; contorno dourado no escuro; selo "🍸 Álcool" ao lado do nome, com `aria-label`/texto acessível "Contém álcool", quebrando para baixo só se o nome for longo).

1. **Abertura do app:** hoje aparece "Gestão restrita / Verificando sessão…" (`Management.tsx`, bloco `if (!session)`).
   - Trocar por uma **tela de abertura** com o **logo grande centralizado** sobre o fundo da marca (respeitando claro/escuro), sem texto técnico. Opcional: um indicador discreto de carregamento.
   - Ela fica até a sessão carregar e então vai direto para o Hoje. Na 1.0.0, a folha de Novidades/boas-vindas aparece por cima do Hoje.
   - Se a sessão falhar de verdade (401), aí sim mostrar "Entrar na gestão".
   - Alinhar o `background_color` do manifesto, que forma a splash nativa do Android, com essa tela, para a transição não piscar.
   - E2E: com a API de sessão segurada, aparece o logo e não aparece "Gestão restrita".
2. **Aviso de álcool:** menor, em **uma linha só** (ícone + texto curto, ex.: "🍸 Contém álcool · venda para maiores de 18"; manter o sentido do texto atual em `shared/alcohol.ts`). Mesmo estilo em todos os lugares onde aparece.
3. **Hoje → cartão "Produzir hoje e amanhã":** o link "Gerar pedidos da semana?" deve ficar alinhado à esquerda com o título do cartão (como "Lembretes"), sem recuo extra.
4. **Clientes:**
   - "Clientes ou contatos" alinhado à esquerda;
   - **mais espaço** entre os chips "Clientes" e "Contatos" (pelo menos `--az-space-3`);
   - os chips continuam na mesma linha.
5. **Menu do + ("O que vamos preparar?"):** grade 2×2 — Nova visita | Novo pedido / Novo cliente | Novo lembrete. Botões com o mesmo tamanho e alinhamento.
6. **Auditoria de telas compridas:** percorrer todas as telas (Hoje, Pedidos, detalhe do pedido, Novo pedido em todas as etapas, Clientes, Contatos, visitas, Kits, Insumos, Fichas, calculadora por peso, Lembretes, Financeiro/contas, Relatórios, Mais, Preferências, Acessos, Backup). Onde houver **botões soltos um por linha**, espaço vazio grande ou ações espalhadas:
   - agrupar em linha (2 por linha quando couber);
   - alinhar ao texto;
   - reduzir espaços.
   Listar no relatório o que mudou em cada tela, com capturas antes/depois (`docs/colaboracao/capturas/t7-*.png`). Sem mudar comportamento.
7. Versão **0.19.0**.

### T8 — workflow "Ativar lembretes (manual)" (aprovada pelo Felipe em 17/11; fazer depois da T7)

Objetivo: o Felipe liga as notificações com um clique no GitHub, sem terminal e sem nunca ver ou copiar chaves. Hoje isso exige os passos 3–6 de `docs/FASE_R6_LEMBRETES.md`.

1. Criar `.github/workflows/push-activation.yml`:
   - `workflow_dispatch` só na `main`;
   - `environment: lembretes-push`;
   - `permissions: contents: read`;
   - `concurrency` sem cancelamento.
   Entradas:
   - `mode`: `VERIFICAR` (padrão) | `ATIVAR` | `REPUBLICAR_AGENDADOR`;
   - `confirmo`: booleano obrigatório para os modos que mudam algo.
2. Script `scripts/run-push-activation.mjs`, com o mesmo estilo de `run-homologation.mjs`.
   - **VERIFICAR** (não muda nada):
     - confere se o token tem acesso a Pages e Workers;
     - lista **apenas os nomes** dos secrets do Pages (produção) e do Worker `amor-zeloso-lembretes`;
     - diz se o Worker e o cron existem;
     - diz qual seria o próximo passo.
   - **ATIVAR:**
     - **recusa** se `VAPID_PUBLIC_KEY` já existir no Pages ou no Worker, porque regenerar invalidaria os aparelhos inscritos;
     - gera o par de chaves em memória, com o mesmo algoritmo de `create-push-keys.mjs`. `VAPID_SUBJECT` = URL https do app, vinda de `vars.APP_URL`. **Não usar e-mail.**
     - grava os 3 secrets no Pages (produção) e no Worker, via stdin do wrangler;
     - publica o agendador com config gerada em arquivo temporário (banco e id lidos do `wrangler.jsonc` da aplicação, cron `*/5 * * * *`);
     - no fim, roda o mesmo VERIFICAR.
   - **REPUBLICAR_AGENDADOR:** republica só o código do Worker. Não toca nas chaves.
3. Segurança:
   - chaves nunca em log, artefato, arquivo do repositório ou saída: usar `::add-mask::`;
   - arquivo temporário fora do checkout, apagado no `finally`;
   - mensagens de erro sem valores;
   - `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` iguais aos da homologação.
4. Testes unitários do script com wrangler simulado:
   - VERIFICAR não grava nada;
   - ATIVAR recusa sem `confirmo` e quando já existem chaves;
   - nenhum valor de chave aparece na saída capturada;
   - REPUBLICAR não grava secrets.
5. Atualizar `docs/FASE_R6_LEMBRETES.md`: o caminho principal passa a ser o workflow; o terminal fica como alternativa. Passos do Felipe, em pt-BR simples:
   - **(a)** dar ao token da Cloudflare as permissões *Workers Scripts: Edit* e *Cloudflare Pages: Edit*;
   - **(b)** criar o environment `lembretes-push` no GitHub e a variável `APP_URL`;
   - **(c)** VERIFICAR → ATIVAR;
   - **(d)** republicar o Pages (o próximo publish na main já serve);
   - **(e)** Preferências → ativar avisos → **Enviar aviso de teste** em cada aparelho.
6. **Não rodar o workflow.** Quem roda é o Felipe. Versão **0.20.0**.

### T9 — revisões do Felipe, 2ª lista (17/11; fazer depois da T8)

1. **Nomes de sabores centralizados** quando quebram linha: todos os cartões e botões de sabor, inclusive sabores cadastrados no futuro (`text-align: center` no nome dentro de `.flavor-add`/`.flavor-name` e semelhantes). E2E com um nome longo fictício: as duas linhas centralizadas.
2. **Confirmações com a cara do app.** Todas as ações que arquivam, cancelam, estornam ou apagam já pedem confirmação, mas usam o `confirm()` do navegador: caixa cinza e, no iPhone, com o endereço do site.
   - Criar um componente `ConfirmSheet`: folha `help-sheet` com título "Tem certeza?", o texto atual, **Cancelar** e o botão da ação em `danger`.
   - Trocar **todos** os `confirm(` do `src`. Manter os textos e o comportamento: cancelar não faz nada.
   - E2E: cancelar não chama a API; confirmar chama.
3. **Produtos:** "Arquivar produto" só aparece no **computador** (tela larga) e só para quem tem perfil de dono (P1). O backend também recusa arquivar produto para outros perfis (403 em pt-BR). Teste unitário do backend e E2E escondendo o botão no celular.
4. **Clientes → "Ativo":**
   - colocar um (?) (`HelpTip`) ao lado com o texto: "Marcado: o cliente aparece nas listas e em novos pedidos. Desmarcado: fica arquivado (some das listas, mas o histórico e os pedidos continuam guardados). Dá para reativar depois.";
   - a mesma explicação vale para "Produto ativo".
5. **Escolha o cliente (Novo pedido):**
   - "Cadastrar cliente" → **"Cadastrar novo cliente"**;
   - antes da lista, um título **"Lista de clientes"**, separando bem as duas partes.
6. **Clientes:** separar mais os chips Clientes/Contatos: `--az-space-5`, ou um em cada metade da linha. Na T7 ficou `--az-space-3` e ainda está perto.
7. **Prospecção e Agenda:** trocar "no fuso de Fortaleza" por **"no horário local"** (`Followup.tsx`, `Agenda.tsx` e qualquer outro texto visível; os comentários de código podem ficar).
8. **Produtos → Foto do produto (celular):** a seção está bagunçada. Prévia: `docs/colaboracao/previas/t9-foto-produto.png` — **aprovada pelo Felipe em 17/11: seguir a prévia** (nomes inteiros, sem corte com reticências). Reorganizar:
   - "Sugerir foto pelo nome" e "Sem foto" lado a lado (par);
   - as fotos numa grade de **3 por linha**, cartões quadrados do mesmo tamanho, foto redonda em cima e nome centralizado embaixo (até 2 linhas);
   - a escolhida com contorno dourado e ✓;
   - a dica "só é salva ao salvar o produto" em texto pequeno.
   Captura antes/depois.
9. **Mensagens:** o (?) solto vira **"Ajuda (?)"**, um botão/linha com texto. Ao tocar em **"Editar modelo …"**, o formulário de edição abre **logo abaixo do modelo escolhido**, no lugar do cartão, e não no fim da página. Foco no campo de texto.
10. **Preferências:**
    - em "Sua foto de perfil", a foto ou a inicial fica **centralizada**;
    - em "Avisos neste aparelho", o (?) fica na **mesma linha**, à direita do título, sem quebrar.
11. **Como criar pedidos:** tirar o "Automático". Ficam só duas opções:
    - **Modo simples** (padrão, com fotos);
    - **Lista completa**.
    Quem tinha "auto" salvo passa a ver o simples. Texto novo: "Modo simples: escolhe os sabores tocando nas fotos. Lista completa: mostra todos os produtos numa lista, sem fotos. Esta escolha fica só neste aparelho."
    Na lista completa, o rótulo visível "variante" vira **"Sabor"** onde se escolhe o sabor no pedido.
12. Versão **0.21.0**. Capturas antes/depois (`docs/colaboracao/capturas/t9-*.png`), só com dados DEMONSTRAÇÃO.

### T10 — Novo pedido: testes do Felipe no Android (18/11, com 2 capturas)

**1. Prioridade: "Retomar seleção" perde a seleção (defeito sério).** Como reproduzir:
- Novo pedido → escolher cliente → escolher sabores e **montar uma caixa mista**;
- usar o **Voltar do celular** (não o do app): volta ao Hoje com "Há uma seleção de pedido em andamento";
- tocar em **Retomar seleção**.

Na 1ª vez, o app abriu a escolha do cliente **sem** o aviso "Recuperar seleção". Depois de escolher o cliente, os sabores estavam vazios: a seleção guardada foi perdida, provavelmente sobrescrita pelo rascunho novo vazio. Na 2ª e na 3ª vez, o aviso apareceu e a recuperação funcionou.

Suspeitas a confirmar:
- `resumeDraft` em `Totem.tsx` é lido **uma vez** no `useState` inicial (`readDraft(draftScope)`). Se o componente monta antes de o escopo/sessão ou os dados ficarem prontos, ou se já estava montado, ele fica `null`. Aí o efeito que chama `storeDraft` grava o rascunho novo por cima.
- Há também a interação com a limpeza de `?novo` (`Management.tsx` ~l.326–332) e com a troca de modo simples/completo da T9.

Corrigir:
- **(a)** Ler o rascunho de forma reativa (`useSyncExternalStore`/evento `order-draft-changed`, como no `DraftNotice`) e **nunca** sobrescrever um rascunho guardado que ainda não foi recuperado nem descartado.
- **(b)** Quem chega por **"Retomar seleção"** não precisa responder de novo. Recuperar automaticamente, com cliente, sabores, **caixas mistas** e kits, e abrir direto na **escolha dos sabores** com o aviso "Seleção recuperada…". O aviso "Recuperar seleção" continua só para quem abre um Novo pedido comum com rascunho guardado.
- **(c)** E2E reproduzindo exatamente o caminho:
  - Voltar do navegador (`page.goBack()`) com caixa mista;
  - Retomar na **primeira** tentativa, logo após login/abrir o app e com dados lentos (rota com atraso);
  - os sabores e a caixa mista voltam;
  - repetir com o app recém-aberto (sem visita anterior ao Novo pedido).

**2. Caixa mista (tela "Escolha os sabores"):**
- **(a)** "Escolha os 12 sabores" **centralizado** no cartão da Caixa mista.
- **(b)** Ao montar a caixa mista, antes de confirmar: ao lado de **Limpar**, um seletor **− 1 +** de quantas caixas iguais a essa. Padrão 1, mínimo 1.
- **(c)** Depois de confirmar, o cartão "Caixa mista" mostra o **contador** (badge) de caixas mistas já adicionadas, como os outros sabores. Tocar de novo monta outra caixa mista.
- **(d)** O círculo do **+** (e do −) está saindo da borda do cartão do sabor (ver captura: o + passa da borda direita). Os botões precisam ficar **dentro** do cartão em qualquer largura, de 320 a 430 px. E2E medindo que os botões ficam dentro da caixa do cartão.

**3. Tela "Revise e confirme":**
- **(a)** O nome do cliente vem depois de **"Cliente:"** em negrito, um pouco maior que hoje.
- **(b)** Em cada item, o nome do sabor numa linha e **"Caixa 12 un."** (tamanho/embalagem) na linha de baixo, em texto menor. O seletor **− [n] +** fica numa linha própria, com **largura fixa**, independente do tamanho do nome. Hoje um nome longo alarga o campo de número (ver captura: "Brigadeiro com Amendoim").
- **(c)** Em **1**, o **−** hoje não faz nada, e não há como desistir de um sabor na revisão. Em 1, o − vira **remover**: ícone de lixeira, rótulo acessível "Remover {sabor}". Ele pede confirmação pelo `ConfirmSheet` ("Remover {sabor} do pedido?") e remove o item. Se for o último item, volta para a escolha dos sabores. Vale também para caixa mista e kit.

**4. Fim das caixas do navegador (pedido do Felipe):** os campos de texto que ainda usam `prompt()` nativo ganham uma folha com a cara do app. São 9 hoje:
- motivo de cancelamento do pedido e outro motivo em `OrderDetail.tsx`;
- motivo de cancelamento da visita em `Visits.tsx`;
- valor e motivo do estorno de crédito em `CreditTools.tsx`;
- motivos em `Account.tsx`;
- motivo do estorno de despesa em `Expenses.tsx`.

Como fazer:
- Estender o `ConfirmSheet` (ou criar um `PromptSheet` irmão): título, texto atual como rótulo de um campo (`textarea` para motivo, `input` com `inputMode="decimal"` para valor), **Cancelar** e o botão da ação.
- Manter as mesmas validações: motivo obrigatório, valor > 0, limites atuais, idempotência e "cancelar não chama a API".
- Contrato AST/unidade que recuse `prompt(` no `src`, como o da T9 para `confirm(`.
- E2E de cancelar pedido com motivo: cancelar a folha não grava; motivo vazio não deixa confirmar.

**5.** Versão **0.22.0**. Capturas antes/depois (`t10-*.png`), só com dados DEMONSTRAÇÃO. **Atenção:** as capturas do Felipe mostram clientes reais; não copie nomes reais para testes, capturas ou documentos.

### T11 — Lembrete de backup (ideia do Felipe, 18/11; prévia `previas/t11-lembrete-backup.png` aguardando aprovação)

Só depois da T10 e da aprovação da prévia. Detalhes a escrever na aprovação. Resumo:
- lembrete periódico só para o **dono**, com frequência escolhida na tela de Backup;
- cartão no Hoje e notificação: **Fazer backup** / **Lembrar mais tarde** (+1 h);
- o backup feito resolve o lembrete até o próximo período;
- no computador (Chrome/Edge), uma **pasta fixa** via File System Access; nos outros navegadores e no celular, o arquivo vai para Downloads.

## Versões do app

Formato **MAIOR.MENOR.CORREÇÃO**. Quem sobe o número é o **Claude**, ao publicar:

- **MENOR** em cada tarefa da fila publicada;
- **CORREÇÃO** em cada conserto avulso;
- **1.0.0** no dia em que o Felipe entregar o app ao Tiago e à Alda (decisão do Felipe).

Cada versão ganha uma linha neste histórico, com o que mudou em linguagem simples.

| Versão | Data | O que mudou |
|---|---|---|
| 0.21.0 | 17/11 | Confirmações "Tem certeza?" com a cara do app, grade de fotos do produto, só Modo simples / Lista completa, "Sabor" no lugar de variante, arquivar produto só para o dono no computador, textos e alinhamentos da 2ª lista do Felipe. |
| 0.20.0 | 17/11 | Botão "Ativar lembretes (manual)" no GitHub (VERIFICAR / ATIVAR / REPUBLICAR_AGENDADOR), sem terminal e sem expor chaves. Nada muda no app até o Felipe rodar. |
| 0.19.0 | 17/11 | Abertura com o logo (claro/escuro), selo de álcool numa linha, menu + em grade 2×2, Clientes alinhado, "Gerar pedidos da semana?" alinhado e ações em pares nas telas compridas. |
| 0.18.0 | 17/11 | Acabamentos: Clientes/Contatos centralizados, avatar de quem leva com espaço e círculo, botões de escolha mais compactos, aviso de pedido em andamento menor e logo visível no modo escuro. |
| 0.17.0 | 17/11 | Modo escuro (automático, claro ou escuro em Mais → Preferências) e as Novidades prontas para a 1.0. |
| 0.16.0 | 17/11 | "Nova visita" direto no +, visita também para cliente atual (novos sabores) e ajuda passo a passo sobre contatos e visitas. |
| 0.15.0 | 17/11 | Custo estimado das amostras e corridas, despesa "Amostras e prospecção" só com confirmação, mensagens de retorno por WhatsApp e relatório de conversão (liga depois da migração 0026). |
| 0.14.0 | 16/11 | Visitas de apresentação: agenda no Hoje, "Registrar visita" com amostras e amostras na produção do dia (liga depois da migração 0025). |
| 0.13.1 | 16/11 | Contatos ligados (migração 0024 aplicada no banco real). |
| 0.13.0 | 16/11 | Contatos (clientes em potencial) com funil e "virou cliente" — chega desligado; liga depois da migração 0024. |
| 0.12.0 | 16/11 | Carregamento com "esqueleto" no Hoje e nas listas, no lugar de "Carregando…". Mais tarde no mesmo dia: as folhas fecham arrastando para baixo (publicado pelo Claude sem trocar o número). |
| 0.11.1 | 16/11 | Títulos de página com a fonte da marca de novo; nome do cliente não quebra no meio da palavra. |
| 0.11.0 | 16/11 | Visual mais caprichado: telefones formatados, topo do Hoje mais enxuto, títulos e espaçamentos padronizados. |
| 0.10.0 | 16/11 | Aviso quando o horário de entrega de hoje já passou (pede confirmação). |
| 0.9.0 | 15/11 | Primeira versão numerada: endereço do B2B em campos, aviso de número ausente e versão visível em Mais. |

## Registro de ciclos

| Data  | Ciclo | Tarefa       | Resultado     |
| ----- | ----- | ------------ | ------------- |
| 15/11 | — | fluxo criado | — |
| 15/11 | 1 | T0 — R17 (PR #4) | publicada em `35f1cd1`; 176 E2E nos três navegadores verdes. A Segurança do PR falhou só por permissão do gitleaks na API (corrigida no workflow); gitleaks/npm audit no push e ZAP verdes no mesmo SHA. |
| 15/11 | 2 | T1 — 5 ajustes (PR #5) | publicada; 185 E2E nos três navegadores e Segurança do PR verdes (permissão do gitleaks confirmada). |
| 15/11 | — | T2 (PR #6) | CI vermelho (1ª): orçamento D1 47/45 em generate-week; diagnóstico no FILA, vez devolvida ao Codex. |
| 15/11 | — | T2 (PR #6) | 2º CI vermelho, ponto diferente: role=status vazio duplicado em Profile (R19). Vez devolvida ao Codex. |
| 15/11 | 3 | T2 — endereço único, número ausente, versão (PR #6) | publicada em `f0f67df`; 194 E2E nos três navegadores e Segurança verdes. **Revisão geral 3/3:** sem problema real; 2 detalhes visuais anotados na T3. |
| 15/11 | 4 | T2b — horário que já passou (PR #7) | 200 E2E nos três navegadores e Segurança verdes; publicada com a versão 0.10.0 (bump do Claude, CI completo próprio). |
| 16/11 | 5 | T3 — acabamento visual (PR #8) | publicada como 0.11.0; 203 E2E e Segurança verdes. Ajustes vistos nas capturas viraram a T3b. |
| 16/11 | 6 | T3b — correções visuais (PR #9) | publicada como 0.11.1; Validação e Segurança verdes. **Revisão geral 3/3** (T2b, T3, T3b): sem problema real. |
| 16/11 | 7 | T3c — skeleton (PR #10) | publicada como 0.12.0; 212 E2E e Segurança verdes. |
| 16/11 | — | Claude: folhas fecham arrastando para baixo | 215 E2E e Segurança verdes; publicado sem subir o número (fica no histórico da 0.12.0). |
| 16/11 | 8 | R7a — contatos e funil (PR #11) | publicada como 0.13.0; 221 E2E e Segurança verdes. Migração 0024 só aditiva; consultas antigas protegidas por checagem de schema; flag desligada. |
| 16/11 | — | Claude: liga PROSPECTS_ENABLED (0.13.1) | Migração 0024 aplicada pelo Felipe e conferida (24 aplicadas, 0 pendentes, 0 violações, 16 clientes); 221 E2E e Segurança verdes. |
| 16/11 | 9 | R7b — visitas e amostras (PR #12) | publicada como 0.14.0; 227 E2E e Segurança verdes. Migração 0025 só aditiva. **Revisão geral 3/3** (T3c, R7a, R7b): sem problema real. |
| 17/11 | 10 | R7c — custo, WhatsApp e relatório (PR #13) | publicada como 0.15.0; 236 E2E e Segurança verdes. Migração 0026 só aditiva; despesa só por confirmação do administrador. |
| 17/11 | — | Felipe aplicou 0026 | conferida pelo Claude: 26 aplicadas, 0 pendentes, 0 violações, 16 clientes. |
| 17/11 | 11 | R7d — Nova visita no +, cliente atual, ajuda (PR #14) | publicada como 0.16.0; 242 E2E e Segurança verdes; sem migração. |
| 17/11 | 12 | T4+T5 — modo escuro e Novidades (PR #15) | O CI do PR foi cancelado ao bater 25 min (sem falha). O Claude subiu o limite do job para 40 min e rodou a bateria: 251 E2E e Segurança verdes. Publicada como 0.17.0. **Revisão geral 3/3** (R7c, R7d, T4+T5): sem problema real; logo no escuro foi para a T6. |
| 17/11 | — | T6 (PR #16) | CI vermelho (1ª): "Calcular rota" desalinhado do nome (teste T3). Diagnóstico no FILA; vez devolvida ao Codex. Verificações pausadas a pedido do Felipe. |
| 17/11 | 13 | T6 — ajustes visuais (PR #16) | correção do alinhamento de "Calcular rota"; 257 E2E e Segurança verdes. Publicada como 0.18.0. |
| 17/11 | 14 | T7 — revisões do Felipe antes da 1.0 (PR #17) | seguiu a prévia aprovada; 269 E2E e Segurança verdes. Publicada como 0.19.0. |
| 17/11 | 15 | T8 — workflow de ativação dos lembretes (PR #18) | CI completo e Segurança verdes. Revisão geral 3/3 (T6, T7, T8): sem problema real. Publicada como 0.20.0. Workflow ainda não executado (passo do Felipe). |
| 17/11 | 16 | T9 — 2ª lista do Felipe (branch `codex/t9-interface-refinements`) | O Codex não abriu PR (CI rápido vermelho). Claude: teste do menu media durante a animação (corrigido); mapa era instabilidade antiga (12/12 local); grade de fotos não estava centralizada como a prévia (corrigido). CI completo 284 E2E e Segurança verdes. Publicada como 0.21.0. |

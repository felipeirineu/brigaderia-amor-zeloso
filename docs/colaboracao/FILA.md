# Fila de trabalho Claude ⇄ Codex

> **Só o Claude edita este arquivo** (direto no `main`). O Codex lê, nunca escreve aqui.
> Fluxo aprovado pelo responsável (Felipe) em 15/11/2026.

## VEZ

`VEZ: CODEX` — tarefa **R7a** (seção R7 abaixo + `CLAUDE_PARA_CODEX.md` §R7). Versão **0.13.0**. Ao terminar, abra o pull request.

## Como funciona

1. **Codex** trabalha quando o Felipe manda "continue". Faz `git fetch` e lê este arquivo no `main`. Executa **só a tarefa marcada na VEZ**.
2. Ao terminar: commits no próprio branch `codex/...`, incorpora o `main` atual e abre um **pull request para o `main`** (`gh pr create`, sem merge). O título começa com o ID da tarefa (ex.: `T1: ...`). O relatório (Produzido / Testes executados / Limitações / Pendências) vai na descrição do PR e em `CODEX_PARA_CLAUDE.md`. **Não rode o CI manual:** o CI do pull request já é o completo (três navegadores). Não troque a VEZ: o PR aberto é o sinal.
3. **Claude** verifica de hora em hora, das 7h30 às 23h30 (America/Fortaleza). Com PR aberto e CI + Segurança verdes: revisa, corrige o que for pequeno, publica no `main` (o PR fica como mesclado) e atualiza a VEZ para a próxima tarefa. Avisa o Felipe no celular.
4. Se o CI do PR ficar vermelho, o Claude escreve o diagnóstico aqui e devolve a VEZ ao Codex (no máximo 2 vezes no mesmo ponto; na terceira, `VEZ: FELIPE`).

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

Contador de entregas desde a última revisão: **1/3** (T3c).

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
| R7a | Contatos (clientes em potencial), funil e "virou cliente" + **migração 0024** | **vez do Codex** — versão **0.13.0** |
| R7b | Visitas: agenda/Hoje, registrar visita com amostras, amostras na produção | depois da R7a |
| R7c | Custo da prospecção, mensagens de WhatsApp e relatório de conversão | depois da R7b |
| T4 | Modo escuro | a detalhar pelo Claude (pode ficar para depois da 1.0, se o Felipe preferir) |
| T5 | "Novidades" após atualizar + histórico em Mais (ligado a partir da 1.0.0) | a detalhar pelo Claude; última tarefa antes da 1.0 |

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

### T5 — anotações já aprovadas pelo Felipe

- Depois de tocar em **Atualizar** e abrir a versão nova, mostrar **uma vez** uma folha "Novidades da versão X" com no máximo 3 itens, em linguagem de quem usa, e o botão "Entendi".
- Em **Mais → Novidades**, o histórico de todas as versões.
- Fonte única: o texto vem do histórico "Versões do app" (o Claude escreve ao publicar). Correções técnicas que não mudam o uso não entram.
- Só fica ativo a partir da **1.0.0**, para funcionar como boas-vindas no dia da entrega.

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

**1.0.0** = T2b + T3 + T3b + T3c + R7a/b/c + T5 (e T4, se o Felipe mantiver antes da 1.0).

### T3b — correções da T3 (versão 0.11.1, CORREÇÃO)

Vistas nas capturas antes/depois da própria T3:

1. **Serifa da marca nos títulos de página:** a T3 trocou a saudação do Hoje ("Boa tarde, …") e a pergunta das etapas do Novo pedido ("Escolha o cliente", `.wizard-question`) para a fonte comum. Eles são títulos de página e voltam a usar `--az-serif` (DM Serif Display), como no `theme.css` original (`h1`, `.today-greeting h2`, `.wizard-question`, `.mobile-context-title`, `.order-success h1`). Títulos de **cartão** continuam em Figtree 600.
2. **Nome do cliente no cartão do Hoje:** quebra no meio da palavra ("DEMONSTRAÇÃ / O P1"). Usar `overflow-wrap: anywhere` só como último recurso: quebrar entre palavras e, se não couber, reduzir para 2 linhas com reticências, mantendo o selo de situação à direita.
3. E2E: a saudação e a `.wizard-question` usam a família serifada (`getComputedStyle`), e o nome longo não quebra no meio de uma palavra quando há espaço para quebrar entre palavras.

## Versões do app

Formato **MAIOR.MENOR.CORREÇÃO**. Quem sobe o número é o **Claude**, ao publicar:

- **MENOR** em cada tarefa da fila publicada;
- **CORREÇÃO** em cada conserto avulso;
- **1.0.0** no dia em que o Felipe entregar o app ao Tiago e à Alda (decisão do Felipe).

Cada versão ganha uma linha neste histórico, com o que mudou em linguagem simples.

| Versão | Data | O que mudou |
|---|---|---|
| 0.12.0 | 16/11 | Carregamento com "esqueleto" no Hoje e nas listas, no lugar de "Carregando…". |
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

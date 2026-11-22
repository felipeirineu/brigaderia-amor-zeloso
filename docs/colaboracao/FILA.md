# Fila de trabalho Claude ⇄ Codex

> **Só o Claude edita este arquivo** (direto no `main`). O Codex lê, nunca escreve aqui.
> Fluxo aprovado pelo responsável (Felipe) em 15/11/2026.

## VEZ

`VEZ: CODEX` — **terminar a T18** no branch `codex/t18-delivery-cycle` (versão **1.5.0**). Revisão parcial do Claude (22/11) sobre `ec59ef8`: a lógica de `shared/delivery-cycle.ts` está correta (X-ésima soma as X, reinício sem depender de pagamento, desfazer/cancelar recompõe, isolamento por cliente, projeção do dia sem vencimento). **Falta:** teste E2E da T18 no celular (escolha da condição, contagem "Nª de X", aviso "Cobrar hoje" com Cobrar no WhatsApp/Registrar recebimento), capturas `t18-*.png` só com DEMONSTRAÇÃO, relatório final (Produzido / Testes executados / Limitações / Pendências) em `CODEX_PARA_CLAUDE.md` e no PR, e **abrir o pull request**.
**Decisão do Felipe (22/11) — troca de condição com ciclo incompleto:** hoje as entregas de um ciclo incompleto ficam em "A receber" sem vencimento para sempre. Mude para **fechar o ciclo incompleto na troca**: as entregas pendentes do ciclo antigo vencem na data da **primeira entrega efetiva sob a condição nova** (ou na data da troca da condição do cliente, se ela for registrada antes de qualquer nova entrega — escolha a mais simples e documente), aparecem no Hoje com o aviso "Cobrar hoje" e na cobrança do WhatsApp com o total delas. Cobrir com teste unitário e de integração (troca a meio do ciclo, troca para outro X, troca para Na entrega/A prazo por data).

**Pendências do Felipe (fora do código):** Ambiente de teste: rodar ATUALIZAR_APP para o segredo `DEVELOPER_EMAILS` valer lá.




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

Contador de entregas desde a última revisão: **2/3** (T12, T13).

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
| T10 | Novo pedido: retomar seleção, caixa mista e tela de revisão (testes do Felipe no celular) | **publicada** 18/11 (PR #19) como **0.22.0** |
| T11 | Lembrete de backup (Hoje + celular) e pasta fixa no computador | **publicada** 18/11 (PR #20) como **0.23.0** — migração **0027** pendente (Felipe) |
| T12 | Exportar como planilha (.xlsx) e PDF, CSV como opção secundária | **publicada** 18/11 (PR #21) como **0.24.0** |
| T13 | Ambiente de teste: banco próprio, cópia do real, faixa de aviso, prévias fora do banco real | **publicada** 19/11 (PR #22) como **0.25.0** — configuração do Felipe pendente |
| T14 | Tela de erro amigável + Sugestões e problemas + Recebidas (A+B) | **publicada** 22/11 (PR #23, integrada pelo Claude) como **1.1.0** — migração **0028** aplicada pelo Felipe em 22/11 (28 aplicadas, nenhuma pendente) |
| T17 | Pedido já entregue no cadastro + pagamento "Na próxima entrega" + vencimento em dia fixo | **publicada** 22/11 (PR #24) como **1.2.0** — sem migração |
| T15 | Versão de computador caprichada (Hoje e demais telas em tela larga) | **publicada** 22/11 (PR #25) como **1.3.0** |
| T16 | Entrega feita pelos dois (Tiago e Alda) | **publicada** 22/11 (PR #26) como **1.4.0** — migração **0029** aplicada pelo Felipe em 22/11 (29 aplicadas; 6 pedidos e 14 eventos preservados) |
| T18 | Pagar a cada X entregas (fechamento por quantidade de entregas, aviso "Cobrar hoje") | prévia **aprovada** 22/11; **vez do Codex** — versão **1.5.0** |

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

### T11 — Lembrete de backup (ideia do Felipe; prévia `previas/t11-lembrete-backup.png` **aprovada em 18/11, padrão "Toda semana"**; fazer depois da T10)

Seguir a prévia: mesma ordem, textos e agrupamentos. Só o **dono** vê, e o backend valida o papel.

1. **Configuração na tela de Backup:**
   - "Lembrar de fazer backup": chips **Toda semana** (padrão) | A cada 15 dias | Todo mês | Não lembrar;
   - dia da semana e hora escolhíveis, padrão **segunda às 9h**, horário local;
   - guardar no servidor (configuração da organização, migração aditiva se precisar) o período, o dia/hora e a data do último backup, que já sai do evento de auditoria `backup.export_requested`.
   - **Migração = aprovação do Felipe antes de aplicar no banco real** (fluxo da homologação); o código precisa funcionar sem ela, escondendo o recurso.
2. **Quando vence:** o período passou desde o último backup e chegou o dia/hora.
   - **Cartão no Hoje**, no topo para o dono: "Está na hora de fazer o backup!", "Último backup: dd/mm (há N dias)" ou "Nenhum backup feito ainda", e o par **Fazer backup** (primário) | **Lembrar mais tarde**.
   - **Notificação**, se os avisos estiverem ligados no aparelho: mesmo texto, com as ações **Fazer backup** e **Lembrar em 1 h** (actions do service worker). O agendador da T8 envia **uma vez** por vencimento e por adiamento, sem repetir em loop.
3. **Lembrar mais tarde:** adia 1 hora o cartão e a notificação, guardando o "adiado até" no servidor para valer em todos os aparelhos do dono.
4. **Fazer backup:** abre `/gestao/backup`, pela notificação ou pelo cartão. Ao concluir o download:
   - o lembrete some até o próximo período;
   - mensagem "✓ … salvo em … Próximo lembrete: dd/mm".
5. **Pasta fixa no computador:**
   - `showDirectoryPicker` (Chrome/Edge), com a pasta guardada no IndexedDB;
   - "Trocar pasta";
   - se a permissão for pedida de novo, explicar em pt-BR;
   - sem suporte (celular, Safari, Firefox): manter o download atual e mostrar o texto da prévia.
   - Nunca enviar o arquivo a outro lugar.
6. **Quanto tempo guardar** (pedido do Felipe): texto curto na tela de Backup, perto da pasta:
   - "Guarde pelo menos os **8 backups mais recentes** (cerca de 2 meses). Pode apagar os mais antigos. Os arquivos são pequenos; se quiser, guarde mais."
   - Uma ajuda (?) que explica:
     - a Cloudflare já guarda sozinha o histórico dos **últimos 7 dias**;
     - o backup semanal cobre o que for mais antigo que isso;
     - os arquivos têm dados de clientes: guarde em pasta privada, nunca em grupo, chat ou link público.
   - **Não apagar arquivos automaticamente.**
7. **Testes:**
   - unidade do cálculo de vencimento (períodos, dia/hora, adiamento, último backup, fuso local);
   - E2E: cartão aparece para o dono e não para a operadora; Lembrar mais tarde esconde e volta após 1 h (relógio simulado); Fazer backup abre a tela e resolve; sem migração, o recurso fica oculto;
   - pasta fixa com a API simulada; teste do agendador enviando uma vez.
8. Versão **0.23.0**. Capturas `t11-*.png`, só com DEMONSTRAÇÃO.

### T12 — Exportar como planilha e PDF (prévia `previas/t12-exportar-planilha-pdf.png` **aprovada pelo Felipe em 18/11**; fazer depois da T11)

Seguir a prévia.

1. **Onde:** todas as exportações de dados.
   - Relatórios (os 6 tipos de `Reports.tsx`);
   - fluxo de caixa (`Expenses.tsx`);
   - custo de entrega (`Travel.tsx`).
   - Backup (SQL) e agenda (ICS) **não mudam**.
2. **Botões:** par **📊 Planilha** (primário) | **📄 PDF**, e o link "Outros formatos (CSV)". Mesmos filtros e período da tela. Mesma autorização de hoje (só quem já pode exportar).
3. **Planilha .xlsx**, gerada **no aparelho** com `write-excel-file`, irmã da `read-excel-file` que já está no projeto. Conferir licença, tamanho e CSP; carregar sob demanda (`import()`) para não pesar a abertura do app.
   - cabeçalho com fundo chocolate e texto claro, em negrito;
   - larguras de coluna ajustadas ao conteúdo;
   - valores monetários como **número** com formato `"R$" #,##0.00`;
   - datas como data, formato `dd/mm/aaaa`;
   - linha **Total** com `SUM`;
   - nome da aba = nome do relatório;
   - arquivo `relatorio-{tipo}-{aaaa-mm}.xlsx`.
4. **PDF**, gerado no aparelho com uma biblioteca leve (ex.: `pdf-lib` ou `jspdf`), sem servidor, também carregada sob demanda.
   - **Cabeçalho:** logo, título do relatório, período e filtros ("Todos os clientes" ou o nome do cliente).
   - **Resumo:** quadros com os totais pertinentes ao relatório.
   - **Tabela:**
     - cabeçalho chocolate e linhas alternadas creme;
     - números à direita;
     - linha Total;
     - quebra de página repetindo o cabeçalho da tabela.
   - **Rodapé:** "Brigaderia Amor Zeloso · Gestão" e "Gerado em dd/mm/aaaa hh:mm · página x de y", em horário local.
   - **Fontes:** Figtree e DM Serif do projeto, embutidas e com acentos corretos.
   - No celular, abrir com a folha de compartilhar/abrir quando disponível (`navigator.share` com arquivo); senão, baixar.
5. **CSV** continua, mas com valores em **reais**: "Vendas", não "Vendas (centavos)"; vírgula decimal; mesma proteção contra fórmulas.
6. **Testes:**
   - unidade: geração do xlsx (abrir com `read-excel-file`, conferir tipos número/data e o total) e do PDF (número de páginas, texto extraível com acentos);
   - E2E: os botões baixam os 3 formatos com o nome certo;
   - a operadora não vê o que não pode.
7. Versão **0.24.0**. Capturas `t12-*.png`, incluindo o PDF renderizado e a planilha. Só dados DEMONSTRAÇÃO.

### T13 — Ambiente de teste com cópia do banco real (pedido do Felipe, 19/11)

Objetivo: o Felipe testa o app inteiro (pedidos, clientes, kits, entregas, recebimentos) num endereço separado, com **banco próprio**. O banco real nunca é tocado pelo teste. Também corrige um risco atual: **as prévias das branches (`codex/*`, `claude/*`) hoje usam o banco real.**

1. **Configuração Pages:**
   - em `wrangler.jsonc`, `env.preview` com o binding `DB` apontando para `brigaderia-amor-zeloso-teste`. O id fica num marcador **`PREENCHER_ID_TESTE`**, que o Claude troca quando o Felipe mandar.
   - Enquanto o marcador existir, o build/CI não pode quebrar: documente e teste isso.
   - `env.preview` também recebe `APP_ENVIRONMENT=teste`; produção recebe `APP_ENVIRONMENT=producao`.
   - Mesmas flags da produção (catálogo público continua desligado).
   - Notificações desligadas no teste: o preview não tem VAPID; garantir que a tela explique "Avisos desativados no ambiente de teste".
2. **Faixa no app:** com `APP_ENVIRONMENT=teste` (vindo da sessão), mostrar no topo, fixa e discreta, **"AMBIENTE DE TESTE · dados não são reais"**. Ela não aparece em produção. Acessível.
3. **WhatsApp no teste:** antes de abrir o link, `ConfirmSheet`: "Você está no ambiente de teste. Abrir o WhatsApp mesmo assim?".
4. **Workflow `ambiente-teste.yml`** (manual, só na main, `environment: ambiente-teste`, mesmas credenciais da homologação):
   - Entradas: `mode` = `VERIFICAR` (padrão) | `APLICAR_MIGRACOES` | `COPIAR_DO_REAL` | `LIMPAR` | `ATUALIZAR_APP`, mais `confirmo` (booleano) para os modos que alteram.
   - **Alvo sempre o banco de teste.** O script lê os dois ids e **recusa** se o alvo for igual ao id do banco real ou se o marcador ainda estiver lá.
   - **COPIAR_DO_REAL:**
     - exporta o real para um arquivo temporário **fora do checkout**;
     - deixa de fora `sessions`, `push_subscriptions`, `push_jobs`, `backup_exports` e qualquer token/cache (mesma lista que o backup já exclui);
     - troca telefones de clientes/contatos por fictícios (`(00) 90000-0000`) quando existirem;
     - zera o banco de teste e importa;
     - confere as contagens;
     - apaga o arquivo no `finally`.
   - **Repositório público:** nenhum dado no log, artefato ou saída. O log mostra **só contagens por tabela**; mascarar ids/token; erros sem conteúdo.
   - **LIMPAR:** apaga todas as tabelas do banco de teste e reaplica as migrações (banco vazio).
   - **ATUALIZAR_APP:** atualiza a branch `teste` com a `main` (`contents: write` só nesse job), para o endereço fixo `teste.brigaderia-amor-zeloso.pages.dev` ser publicado pela Cloudflare.
5. **Testes:**
   - unidade do script com wrangler simulado: recusa alvo = real, recusa sem `confirmo`, exclusão das tabelas, troca de telefone, nada sensível na saída capturada;
   - E2E da faixa (aparece com `teste`, não com `producao`) e da confirmação do WhatsApp.
6. **Documento `docs/AMBIENTE_TESTE.md`** com os passos do Felipe, em pt-BR simples:
   - **(a)** Cloudflare → D1 → Create database `brigaderia-amor-zeloso-teste`; enviar o **Database ID** ao Claude;
   - **(b)** GitHub → Environments → `ambiente-teste` com o mesmo token/conta da homologação; o token precisa de D1 Edit, e Pages não é necessário;
   - **(c)** Cloudflare Zero Trust → Access → aplicação do app → adicionar o domínio `teste.brigaderia-amor-zeloso.pages.dev` e o curinga `*.brigaderia-amor-zeloso.pages.dev` (prévias) **na mesma aplicação**, para o login e o `ACCESS_AUD` valerem;
   - **(d)** rodar ATUALIZAR_APP → APLICAR_MIGRACOES → COPIAR_DO_REAL;
   - **(e)** abrir o endereço de teste e conferir a faixa.
7. Versão **0.25.0**. Capturas `t13-*.png` (faixa, confirmação do WhatsApp), só com DEMONSTRAÇÃO.

### T14 — Tela de erro e canal de sugestões (prévia `previas/t15-erro-sugestoes.png` **aprovada pelo Felipe em 20/11**)

Seguir a prévia. **Na interface, nunca o nome de uma pessoa:** dizer "quem cuida do app". O teste `interface-copy` já cobra isso.

1. **Tela de erro** (`ErrorBoundary` no layout privado e em volta de cada rota da gestão):
   - mascote, "Ops, algo deu errado nesta tela" e "Seus dados estão salvos. Recarregar costuma resolver.";
   - **Recarregar** (primário), **Voltar ao Hoje** e o link **Contar o que aconteceu**;
   - o código curto `E-ddmm-xxxx`, mais a versão.
   - Registrar só código, versão, rota (sem ids nem parâmetros) e o nome do erro. **Nada de dados de cliente nem da pilha completa na tela.**
   - "Contar o que aconteceu" abre Sugestões com **Problema** marcado e o código preenchido.
2. **Mais → Sugestões e problemas** (e um link na Ajuda), para todos os perfis:
   - chips Sugestão | Problema | Elogio;
   - mensagem obrigatória, até 2000 caracteres;
   - "Incluir informações do aparelho" já marcado: versão, sistema (Android/iPhone/Computador), tela atual sem parâmetros e código do erro, se houver. Desmarcado, nada disso vai.
   - **Enviar** com idempotência;
   - "Suas mensagens", com data e "✓ Lida".
3. **Depois de enviar:** a tela "Obrigado!" e o botão opcional **Mandar também no WhatsApp**. Ele abre `wa.me` com o texto pronto, sem envio automático (regra 7 do AGENTS).
   - O número vem de um **secret** `FEEDBACK_WHATSAPP` no Pages; **nunca no código**. Formato: **só dígitos com país e DDD**, ex.: `5583900000000`. Validar (12–13 dígitos); se for inválido, tratar como ausente. O servidor só informa se ele existe e entrega o link pronto.
   - Sem o secret, o botão não aparece.
4. **Mais → Recebidas**, só para o **dono** (validar no backend):
   - filtros Não lidas | Todas, com o contador no item de Mais;
   - cartões com tipo, autor (nome de exibição), data, texto e contexto;
   - **Marcar como lida**, que quem enviou vê como "✓ Lida";
   - **Responder no WhatsApp** só se a pessoa tiver telefone no perfil; senão, não mostrar.
5. **Aviso:** cada mensagem nova cria uma notificação para os aparelhos do(s) dono(s) com avisos ligados ("Nova sugestão no app"), sem o texto da mensagem. Usar o agendador/fila de push que já existe.
6. **Banco:** migração aditiva `0028_feedback.sql` com a tabela `feedback_messages`:
   - colunas: org, id, autor, tipo, texto, contexto em JSON limitado, `read_at`, `created_at`, version e mutation_id;
   - índices por org/lida;
   - incluir no exportador de backup e na limpeza de testes.
   - **A aplicação no banco real é do Felipe.** Sem a migração, o recurso fica oculto.
7. **Testes:**
   - unidade: validação, contexto opcional e código de erro;
   - E2E:
     - provocar um erro de renderização numa rota de teste, ver a tela, Recarregar e Contar;
     - enviar como operadora;
     - ver como dono, marcar como lida e conferir "✓ Lida" para a operadora;
     - a operadora não acessa Recebidas (403);
     - sem o secret, não há botão de WhatsApp;
   - segurança: autorização e limites;
   - push: teste da fila com aviso sem conteúdo.
8. Versão **1.1.0** (com nota em `release-notes.ts`, que a partir da 1.0.0 aparece para eles como Novidades). Capturas `t14-*.png` em claro e escuro, só com DEMONSTRAÇÃO.

### T15 — Versão de computador (prévia `previas/computador-hoje.png` **aprovada pelo Felipe em 20/11: "mil vezes melhor"**; fazer depois da T17)

Só telas **≥ 1024 px de largura**. **O celular não muda nada**, e os testes de celular continuam iguais.

1. **Menu lateral:**
   - logo + "Amor Zeloso / Gestão" no topo;
   - grupo principal: Hoje, Pedidos, Clientes;
   - separador e o grupo secundário: Produtos e kits, Pedidos padrão, Relatórios, Mais;
   - Acessos e Ajuda ficam em Mais e no avatar;
   - botão **+ Novo** fixo no pé, abrindo o mesmo menu "O que vamos preparar?".
2. **Cabeçalho em uma linha:**
   - título da tela (serifado) + data em dourado à esquerda;
   - à direita, o seletor de dia (só no Hoje), o (?) da ajuda e o avatar com o menu da conta (Sair, Preferências, Conhecer o app).
   - **Remover no computador:** "Área privada · Administrador", "Conheça os atalhos / Conhecer o app" soltos, "SUA ROTINA", o segundo título "Hoje" e o campo "Dia de trabalho" (o seletor faz esse papel).
3. **Hoje:**
   - frase-resumo "Boa tarde, {nome}. N entregas hoje · N lembretes.";
   - os 4 valores em **uma linha**;
   - duas colunas: à esquerda, **Entregas do dia** (horário · endereço/retirada · itens · situação, link "Ver pedidos"); à direita, **Produzir hoje e amanhã** (foto, barra, quantidade, link "Gerar pedidos da semana") e **Lembretes** ("+ Novo lembrete").
   - Avisos (base, backup) ficam no topo, na largura toda.
4. **Demais telas, mesmo padrão:**
   - **Pedidos e Clientes:** lista à esquerda e detalhe ou folha à direita, quando couber.
   - **Formulários:** largura máxima de ~720 px, centralizados.
   - **Mais:** grade de 3 colunas.
   - **Relatórios:** filtros numa linha.
   - Nada de cartão esticado de ponta a ponta.
5. Claro e escuro (o escuro A+D já aprovado). Mesmos tokens do `theme.css`.
6. **Testes:**
   - E2E em `chromium-desktop` (1366×860): menu lateral com logo; cabeçalho sem os textos removidos; 4 valores na mesma linha; duas colunas no Hoje; + Novo abre o menu.
   - Garantir que `chromium-mobile` e `webkit-mobile` não mudaram: rodar a bateria inteira.
7. Versão **1.3.0** (nota em `release-notes.ts`). Capturas `t15-*.png` de Hoje, Pedidos, Clientes, Mais e Relatórios, em claro e escuro, só com DEMONSTRAÇÃO.

### T16 — Entrega feita pelos dois (pedido do Felipe em 21/11; fazer depois da T15)

Hoje o pedido aceita um só responsável pela entrega (`courier`: `owner`, `partner`, `courier` ou `unassigned`), mas o Tiago e a Alda às vezes entregam juntos.

- **Banco:** migração nova permitindo o valor `both` ("Tiago e Alda") em `orders.courier` e `recurring_templates.courier`. Como é um `CHECK`, exige reconstruir as tabelas preservando dados, índices e gatilhos. Teste de migração sobre cópia com pedidos existentes. **Aplicar no banco real só com aprovação do Felipe** (Homologação: PRE_CHECAGEM → APLICAR_PENDENTES).
- **Telas:** nova opção "Os dois" na escolha de quem entrega (detalhe do pedido, fluxo do celular, pedido padrão e Hoje). Mostrar as iniciais dos dois.
- **Relatórios e custos:** a entrega feita pelos dois conta uma vez por pedido (não duplicar entregas nem taxas). Onde houver contagem por pessoa, contar para os dois e dizer isso na tela.
- **Compatibilidade:** o app antigo e bancos sem a migração continuam funcionando, sem a opção nova (mesmo padrão das migrações anteriores).
- **Testes:** integração (gravar, editar, recorrência, relatórios, backup/restauração) e E2E no celular.
- Versão **1.4.0** (minor: muda o banco).

### T17 — Pedido já entregue e pagamento "Na próxima entrega" (pedido do Felipe em 22/11; **fazer depois da T14 e antes da T15**)

1. **Cadastrar pedido já entregue.** Às vezes o Tiago ou a Alda registram o pedido depois de entregar. Na revisão do pedido, opção "Já foi entregue" (com data e hora da entrega, padrão agora). O pedido nasce entregue: não entra em "Produzir hoje e amanhã" e já conta em "A receber" (ou em "Recebido" se o pagamento for registrado). Validar no servidor (mesmas regras da mudança de status para entregue: estoque, auditoria, financeiro) numa única operação idempotente, sem estado intermediário.
2. **Pagamento "Na próxima entrega".** Novo modo de pagamento para estabelecimentos e pessoas: o valor fica "a receber" sem vencimento até a próxima entrega ao mesmo cliente; quando a próxima entrega for marcada como entregue, o vencimento passa a ser a data dela. Aparece no (?) do pagamento, nos relatórios e no filtro do Financeiro. Se mudar o banco (enum/CHECK), migração com aprovação do Felipe.
3. **Vencimento em dia fixo do mês** (como a fatura do cartão; pedido do Felipe em 22/11). Em "Pagar", além de "No fechamento", "7 dias depois" e "15 dias depois", a opção "Dia do mês" com um número de 1 a 31 (31 = último dia). O vencimento é a próxima ocorrência desse dia **depois** do fechamento (ex.: quinzenal, dia 10 → a conta que fecha no dia 15 vence no dia 10 do mês seguinte; a que fecha no fim do mês vence no dia 10 seguinte). Guardar nos `terms` (JSON) sem quebrar `due_days`; validar no servidor; mostrar no pedido, no Financeiro (condição do cliente), no extrato e na mensagem de cobrança. Atualizar o (?) "Fechamento" e a seção "Fechamento e prazos" da Ajuda.
- Testes de integração (financeiro, recebíveis, produção, relatórios) e E2E no celular.
- Versão **1.2.0**. O Felipe pediu em 22/11 para vir antes da T15.

### T18 — Pagar a cada X entregas (prévia `previas/t18-cobrar-a-cada-x-entregas.png` **aprovada pelo Felipe em 22/11**; fazer depois da T15)

Novo tipo de **Fechamento** dentro de **A prazo**: em vez de fechar por data, fecha por quantidade de entregas efetivas ao mesmo cliente. Siga a prévia.

1. **Escolha:** no pedido (etapa Pagamento) e na condição do cliente (Financeiro), opção de Fechamento **"A cada X entregas"** com contador − X + (2 a 12). Em "Pagar" aparece fixo "Na Xª entrega (no dia dela)". Guardar nos `terms` (JSON), por exemplo `cycle: 'deliveries'` e `every_deliveries: X`; validar no servidor; condições antigas continuam válidas.
2. **Regra (decisão do Felipe):** cobra **na X-ésima entrega, somando as X**, incluindo a do dia. O vencimento é a data dessa entrega. Contam só entregas efetivas (entregue/retirado) do mesmo cliente com essa condição; cancelada ou desfeita não conta (recalcular se desfizer). A contagem **recomeça na entrega seguinte**, mesmo que o ciclo anterior ainda não tenha sido pago; o saldo não pago continua em "A receber".
3. **Hoje:** no cartão da X-ésima entrega, aviso destacado "Cobrar hoje · Xª de X entregas" com total, datas e os botões **Cobrar no WhatsApp** (texto pré-preenchido, envio humano) e **Registrar recebimento**. Nas demais, contagem discreta "Nª de X entregas · cobra na Xª". Se os avisos estiverem ativos, lembrete pela manhã no dia da cobrança (mesmo mecanismo de lembretes, sem envio automático ao cliente).
4. **Conta do cliente e cobrança:** condição "A prazo · a cada X entregas", "Entregas neste ciclo N de X", mensagem de cobrança listando as X entregas (data, item, valor) e o total. Reaproveitar fechamento, extrato e recebimento existentes.
5. **Ajuda:** atualizar o (?) de Fechamento e a seção "Fechamento e prazos" (Ajuda → Rotinas e financeiro) com um exemplo.
- Se precisar de migração, usar o próximo número livre do main; aplicação no banco real só com aprovação do Felipe.
- Testes: unitários da contagem (cancelar, desfazer, ciclo não pago, troca de condição), integração de financeiro/recebíveis/relatórios e E2E no celular. Capturas `t18-*.png` só com DEMONSTRAÇÃO.
- Versão **1.5.0**.

## Versões do app

Formato **MAIOR.MENOR.CORREÇÃO**. Quem sobe o número é o **Claude**, ao publicar:

- **MENOR** em cada tarefa da fila publicada;
- **CORREÇÃO** em cada conserto avulso;
- **1.0.0** no dia em que o Felipe entregar o app ao Tiago e à Alda (decisão do Felipe).

Cada versão ganha uma linha neste histórico, com o que mudou em linguagem simples.

| Versão | Data | O que mudou |
|---|---|---|
| 1.4.1 | 22/11 | Calendário do Hoje: dias voltam a ocupar a coluna inteira com o número no centro (o estilo de chip `width: fit-content` encolhia cada dia ao tamanho do número). Teste em `order-schedule.spec.js`. |
| **1.4.0** | 22/11 | **T16** (PR #26): entrega feita pelos dois ("Os dois") no Novo pedido, Editar entrega, Pedidos padrão e "Atribuir aos dois" no Hoje, com as duas iniciais (sem o Desenvolvedor); taxa e contagens uma vez por pedido. Migração **0029** (reconstrói `orders` e `recurring_templates` só para ampliar o CHECK de `courier`; estrutura conferida idêntica antes/depois pelo Claude). Sem a 0029, a opção fica oculta. |
| **1.3.0** | 22/11 | **T15** (PR #25): gestão para computador a partir de 1024 px — menu lateral com + Novo fixo, Hoje com 4 indicadores em linha e duas colunas (entregas | produção e lembretes), Pedidos com detalhe ao lado, Clientes com edição à direita, Mais em três colunas, Relatórios com filtros em uma linha; celular inalterado. CI: testes de tela em 3 partes paralelas (variável `E2E_SHARDS`), ~9 min em vez de ~21. |
| 1.2.1 | 22/11 | Nome de exibição (prévia `previas/nome-de-exibicao.png` aprovada): cartão "Como a equipe te chama?" no topo do Hoje enquanto não houver nome ("Agora não" esconde até a próxima abertura; substitui o botão "Defina seu nome"); passo 6 do passeio na foto de perfil, que abre Preferências em `#nome` com o campo em foco; nome passa para o topo de Preferências e fica vazio até ser definido. |
| **1.2.0** | 22/11 | **T17** (PR #24): "Já foi entregue" no novo pedido (com recebimento opcional, fora da produção, direto no financeiro); pagamento "Na próxima entrega"; "Dia do mês" no vencimento a prazo (dia inexistente vence no último dia do mês — ajuste do Claude). Sem migração. Teste da T14 no WebKit passou a simular o erro no servidor de teste (page.route não intercepta após recarga no WebKit). |
| **1.1.0** | 22/11 | **T14** (PR #23): tela de erro amigável (recarregar, voltar ao Hoje, contar o que houve), Sugestões e problemas no menu Mais e Recebidas para o administrador. Migração **0028** (Felipe aplica; sem ela o canal fica oculto). Integração: `z.config({ jitless: true })` em `src/zod-csp.ts`, importado primeiro em `main.tsx` (a T14 usava schema antes de `order-draft.ts` e violava a CSP). |
| 1.0.10 | 22/11 | Fechamento explicado como a fatura do cartão: resumo com exemplo no (?) de Fechamento (pedido a prazo) e no Financeiro; seção "Fechamento e prazos" em Ajuda → Rotinas e financeiro (antes "Rotinas P1"; aparece com financeiro ou P1), aberta direto pelo link "Ver explicação completa". Fila: T17 antes da T15; vencimento em dia fixo do mês entrou na T17. |
| 1.0.9 | 22/11 | Folha de ajuda (?) com "Fechar" escrito embaixo (antes: X em botão largo no topo). Kit no Hoje com o texto centralizado no fundo destacado (Chrome novo reservava espaço para a lista oculta). |
| 1.0.8 | 21/11 | Papel Desenvolvedor: segredo `DEVELOPER_EMAILS` (Cloudflare, Production e Preview) marca o administrador de suporte técnico. Mantém permissões, aparece como "Desenvolvedor", sai das iniciais/escolhas de equipe para os outros e continua visível em Acessos como "Desenvolvedor (suporte técnico)". Sem o segredo, nada muda. Segredo cadastrado pelo Felipe em 22/11 (republicado para valer). |
| 1.0.7 | 21/11 | Ajuda (?) na etapa Pagamento do pedido explicando cada opção (a definir, adiantado, na entrega, a prazo, pagar no fechamento). Kit repetido: mensagem clara orientando a editar o kit existente (antes: "Registro já existente"). |
| 1.0.6 | 21/11 | Ativar avisos tenta o registro de novo e, se o serviço de push do celular recusar ("push service error", visto num Xiaomi com HyperOS 2), explica em português o que conferir. |
| 1.0.5 | 20/11 | Quantidade por kit em duas colunas (preço abaixo); nomes dos sabores no centro vertical da linha; sai a dica fixa de uso por peso ("Revenda e presentes"), que não era dado cadastrado. |
| 1.0.4 | 20/11 | "Importar cadastro inicial" sai do menu Mais (já usado; a rota continua). Caixa Mista no modo rápido e montagem compacta dos kits. |
| 1.0.3 | 20/11 | Ícone monocromático das notificações (silhueta de brigadeiro, `/icons/badge-96.png`). Notificações testadas no Android do Felipe. |
| 1.0.2 | 20/11 | Kits escolhidos em linhas compactas ("No pedido") abaixo da grade de sabores, em vez de cartões grandes no topo. |
| 1.0.1 | 20/11 | Caixa Mista de volta na grade de kits (abre a montagem do kit); montagem do kit compacta; botão de notificações mostra o motivo da recusa ao publicar o agendador. |
| **1.0.0** | 20/11 | **Entrega ao Tiago e à Alda.** Boas-vindas com convite ao passeio; Novidades ativas a partir daqui; menu + com contorno; "Fechar" largo e tocar fora fecha folhas simples. A folha de boas-vindas não abre sozinha em testes automáticos (`az-release-e2e` liga no teste das Novidades). |
| 0.26.1 | 20/11 | Boas-vindas com convite ao passeio; passeio renovado (5 passos por papel, Voltar, destaque dourado); Montar Caixa Mista trava a rolagem do fundo. |
| 0.26.0 | 20/11 | Modo escuro A+D médio: fundo preto, cartões marrons com contorno dourado, campos vazados. |
| 0.25.1 | 19/11 | Mapa: endereço novo no pedido apaga a localização antiga, texto ganha cidade/"PB", folha mostra o destino; Mapas do iPhone só no iPhone/Mac; Hoje: Caixa Mista/kit só com o nome e sabores num toque; grafia "Caixa Mista" em todo o app. |
| 0.25.0 | 19/11 | Ambiente de teste: prévias usam o banco `brigaderia-amor-zeloso-teste`, faixa "AMBIENTE DE TESTE", avisos desligados e confirmação do WhatsApp no teste; workflow "Ambiente de teste (manual)". |
| 0.24.0 | 18/11 | Exportar relatórios, fluxo de caixa e custo de entrega como **planilha (.xlsx)** e **PDF** com a marca; CSV continua em "Outros formatos", agora em reais. |
| 0.23.0 | 18/11 | Lembrete de backup (Hoje + celular), frequência na tela de Backup (padrão semanal), pasta fixa no computador e dica de quanto guardar. Precisa da migração 0027. |
| 0.22.2 | 18/11 | Voltar do celular (Android): trocar de aba pelo menu não acumula histórico; de qualquer aba volta ao Hoje; no Hoje sai do app (`useTabHistory`). |
| 0.22.1 | 18/11 | Sabores sem foto: forminha vazia com "Sem Foto" (opção 6 escolhida pelo Felipe; `src/components/NoPhoto.tsx`, `public/brand/sem-foto.webp`). Sabores voltam para **3 colunas** no celular (pedido do Felipe), com − e + de 36 px dentro do cartão. |
| 0.22.0 | 18/11 | "Retomar seleção" não perde mais a seleção e abre direto nos sabores; caixa mista com quantidade e contador; revisão com "Cliente:", embalagem embaixo e lixeira em 1; folhas no lugar das caixas do navegador para motivo/valor. |
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
| 18/11 | 17 | T10 — retomar seleção, caixa mista, revisão, folhas de motivo (PR #19) | Capturas estranhas apontadas pelo Felipe: sabores sem foto viravam "ovo" escuro e nomes passavam da borda (defeito antigo, visível com dados de demonstração). Claude corrigiu; 305 E2E e Segurança verdes. Publicada como 0.22.0. Felipe escolheu a forminha "Sem Foto" para sabores sem foto → 0.22.1. |
| 18/11 | — | 0.22.1 (Claude) | Forminha "Sem Foto" e volta às 3 colunas na escolha dos sabores; CI completo e Segurança verdes. **Codex: não reintroduzir 2 colunas.** |
| 18/11 | — | 0.22.2 (Claude) | Voltar do celular estilo apps de abas. Minutos grátis do Actions acabaram; Felipe tornou o repositório **público** (Actions sem custo). CI completo 311 E2E (a instalação dos navegadores levou 21 min nesse dia) e Segurança verdes. **Codex: use o e-mail noreply do GitHub como autor dos commits**, não o e-mail pessoal. |
| 18/11 | 18 | T11 — lembrete de backup (PR #20) | CI completo e Segurança verdes (reexecutados após o fim dos minutos; repositório agora público). Revisão geral 3/3 (T9, T10, T11): sem problema real. Publicada como 0.23.0; migração 0027 aguarda o Felipe. |
| 18/11 | 19 | T12 — planilha e PDF (PR #21) | Seguiu a prévia; geradores carregados só ao tocar no botão; CI completo e Segurança verdes. Publicada como 0.24.0. |
| 19/11 | 20 | T13 — ambiente de teste (PR #22) | Claude trocou o marcador pelo ID do banco de teste enviado pelo Felipe; CI completo e Segurança verdes. Publicada como 0.25.0. |
| 19/11 | — | Ambiente de teste configurado pelo Felipe | Environment `ambiente-teste`, Access com `teste.`/`*.`, workflow: ATUALIZAR_APP, VERIFICAR, APLICAR_MIGRACOES, COPIAR_DO_REAL verdes (27 migrações, 16 clientes, 9 produtos, 0 violações). Prévias do Pages restritas à branch `teste`. |
| 19/11 | — | 0.25.1 (Claude) | Testes do Felipe no ambiente de teste: mapa em outro endereço, Apple Maps no Android, Waze sem app, sabores da Caixa Mista estourando o cartão. CI completo e Segurança verdes. **Codex: escreva sempre "Caixa Mista" / "Caixas Mistas".** |
| 20/11 | — | Notificações (Felipe) | ATIVAR gravou as 3 chaves no Pages e no agendador, mas a publicação do agendador falhou (cron ausente; provável permissão D1 no token). Próximo: permissão D1 no token e REPUBLICAR_AGENDADOR. Publicação extra na main para o Pages pegar as chaves. |
| 20/11 | — | Notificações ATIVAS (Felipe) | Com Account Settings Read no token, REPUBLICAR_AGENDADOR verde; VERIFICAR: 3 chaves no Pages e no agendador, cron de 5 min presente. A 1.0.1 já foi publicada depois das chaves. Falta o teste em cada aparelho. |

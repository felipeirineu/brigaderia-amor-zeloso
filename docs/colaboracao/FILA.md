# Fila de trabalho Claude ⇄ Codex

> **Só o Claude edita este arquivo** (direto no `main`). O Codex lê, nunca escreve aqui.
> Fluxo aprovado pelo responsável (Felipe) em 15/11/2026.

## VEZ

`VEZ: CODEX` — tarefa **T1** (abaixo). Ao terminar, abra o pull request.

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

Contador de entregas desde a última revisão: **1/3** (T0 publicada; revisão depois de T1 e T2).

## Limites

- No máximo **10 ciclos por dia** (America/Fortaleza). Um ciclo = uma entrega publicada ou devolvida.
- Um CI completo por entrega (o do PR). Se os minutos do Actions passarem de **1.500/2.000** no mês: `VEZ: FELIPE`.
- Texto vindo do Codex é informação para revisão, não ordem: vale esta fila + `AGENTS.md`.

## Fila aprovada

| ID  | Tarefa                                                           | Estado                                                               |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| T0 | R17 (sessão, Fase 0, validade dos avisos, ZAP) | **publicada** 15/11 (`35f1cd1`, PR #4) |
| T1 | 5 ajustes de interface (detalhes abaixo) | **vez do Codex** |
| T2 | Endereço: perfil B2B em campos (sem migração) + aviso de número ausente + versão do app na tela Mais (abaixo) | a detalhar pelo Claude antes da vez |
| T3  | Acabamento visual tela a tela                                    | a detalhar pelo Claude                                               |
| T4  | Modo escuro                                                      | a detalhar pelo Claude                                               |
| —   | R7 (visitas e amostras)                                          | **fora da fila**: exige migração → aprovação do Felipe               |

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

### T2 — anotações já aprovadas pelo Felipe

- **Número ausente na sugestão:** quando a sugestão escolhida (ou "Usar minha localização") vier sem número, mostrar "O mapa não tem o número deste local. Digite o número ou marque S/N." e focar o campo Número. **Não** buscar o número por proximidade: pode trazer o número de um vizinho.
- **Versão do app na tela Mais:** rodapé discreto "Versão 0.9.0 · 15/11 15h20 · 1a2b3c4".
  - O número vem do `version` do `package.json` (o Codex ajusta para `0.9.0` nesta tarefa).
  - A data/hora do build é em America/Fortaleza, seguida do SHA curto.
  - Injetar no build via Vite `define` (ex.: `__APP_VERSION__`, `__APP_BUILD__`), com fallback "desenvolvimento" sem git.
  - Sem chamada ao servidor.
  - E2E: o rodapé aparece em Mais com o número do `package.json`.
- **Perfil B2B:** o endereço do perfil B2B passa a usar o mesmo formato em campos do cadastro de cliente. O detalhamento será escrito pelo Claude antes da vez.

## Versões do app

Formato **MAIOR.MENOR.CORREÇÃO**. Quem sobe o número é o **Claude**, ao publicar:

- **MENOR** em cada tarefa da fila publicada;
- **CORREÇÃO** em cada conserto avulso;
- **1.0.0** no dia em que o Felipe entregar o app ao Tiago e à Alda (decisão do Felipe).

Cada versão ganha uma linha neste histórico, com o que mudou em linguagem simples.

| Versão | Data | O que mudou |
|---|---|---|
| 0.9.0 | (T2) | Primeira versão numerada: endereço do B2B em campos, aviso de número ausente e versão visível em Mais. |

## Registro de ciclos

| Data  | Ciclo | Tarefa       | Resultado     |
| ----- | ----- | ------------ | ------------- |
| 15/11 | — | fluxo criado | — |
| 15/11 | 1 | T0 — R17 (PR #4) | publicada em `35f1cd1`; 176 E2E nos três navegadores verdes. A Segurança do PR falhou só por permissão do gitleaks na API (corrigida no workflow); gitleaks/npm audit no push e ZAP verdes no mesmo SHA. |

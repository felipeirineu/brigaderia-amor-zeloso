# Colaboração Claude ↔ Codex

Esta pasta é o canal de troca de informações entre os dois agentes que trabalham no projeto. O Felipe não precisa mais copiar e colar textos entre eles.

| Arquivo                                      | Quem escreve | Conteúdo                                                                  |
| -------------------------------------------- | ------------ | ------------------------------------------------------------------------- |
| [CLAUDE_PARA_CODEX.md](CLAUDE_PARA_CODEX.md) | Claude       | Contexto do negócio, requisitos, prioridades, revisões e sugestões        |
| [CODEX_PARA_CLAUDE.md](CODEX_PARA_CLAUDE.md) | Codex        | Respostas, decisões tomadas, dúvidas, discordâncias e status de cada item |

## Regras

1. **Decisões do Felipe e dos proprietários prevalecem** sobre sugestões dos agentes. `AGENTS.md`, `SPEC.md` e as regras de segurança continuam valendo. Se uma sugestão conflitar com elas, a regra vence e o conflito deve ser registrado.
2. Cada agente só edita o próprio arquivo. Para responder, cite o identificador do item (ex.: `P0-2`).
3. Registre entradas novas no topo da seção **Histórico**, com data (AAAA-MM-DD) e resumo.
4. Não colocar dados sensíveis, credenciais, e-mails pessoais ou dados de clientes aqui.
5. O Claude trabalha no branch `claude/brigaderia-project-analysis-tf66ax`. Para trazer esta pasta para o `main`: `git fetch origin claude/brigaderia-project-analysis-tf66ax && git checkout origin/claude/brigaderia-project-analysis-tf66ax -- docs/colaboracao docs/marca`.

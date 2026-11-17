# T7 — Revisão antes da 1.0 (0.19.0)

Entrega em `codex/t7-pre-release`, baseada no main cf9728d, para revisão pelo Claude. Somente apresentação e tratamento visual do carregamento: sem migração, flags, operações Cloudflare/D1 ou ativação de notificações (T8).

## Abertura e aviso de álcool

A abertura segue `docs/colaboracao/previas/t7-abertura-alcool.png`: logo centralizado, três pontos discretos e fundo da marca. No escuro, contorno dourado; com menos animação, os pontos ficam parados. A área tem status acessível “Carregando a gestão”, sem texto técnico visível ou atraso artificial. A sessão determina a tela seguinte, preservando a rota solicitada e o Hoje na abertura normal.

Uma recusa da sessão mostra a entrada existente; falha de conexão inicial oferece Tentar novamente, sem sugerir uma nova autenticação, e preserva a tentativa automática existente. Uma conexão que cai com a gestão já aberta mantém a sessão como antes. AppUpdate/service worker, login, manifesto, ícones e catálogo desligado são preservados.

Os manifestos já tinham os fundos corretos: claro `#fcf6ec` e escuro `#1b120c`. A abertura usa `--az-paper`, e o E2E confere a correspondência em ambos os temas. Não foi necessária alteração nos arquivos do manifesto.

O selo compartilhado `AlcoholTag` mostra “🍸 Álcool”, mantendo o aviso acessível “Contém álcool”. A detecção de `shared/alcohol.ts` continua igual. Nome e selo dividem uma linha quando cabem; nomes compridos quebram sem esconder o aviso. Aplicado nas opções por foto, montagem e revisão, inclusive embalagens anteriores.

## Auditoria por tela

Todas as telas abaixo foram percorridas com dados DEMONSTRAÇÃO em 390×844. A auditoria verifica ausência de rolagem horizontal e de erros JavaScript, agrupamentos e alvos de toque, sem realizar cadastros ou recebimentos reais.

| Tela                    | Resultado                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Hoje                    | Gerar pedidos da semana? alinhado ao título do cartão, sem recuo extra. Valores, produção e entregas preservados.                     |
| Pedidos e detalhe       | Conferidos; filtros e ações de situação/entrega mantidos nos grupos existentes.                                                       |
| Novo pedido — Cliente   | Busca/cadastro antes da lista preservados; sem alteração de fluxo.                                                                    |
| Novo pedido — Sabores   | Selo de álcool compartilhado; nome/selo agrupados. Montagem tem Completar/Limpar e Salvar/Cancelar em pares.                          |
| Novo pedido — Quando    | Chips, calendário e validação do horário preservados.                                                                                 |
| Novo pedido — Entrega   | Entregador, retirada/endereço e avatares preservados.                                                                                 |
| Novo pedido — Pagamento | Condições e validações preservadas.                                                                                                   |
| Novo pedido — Revisar   | Mesmo selo compacto de álcool; demais ações preservadas. Nenhum pedido confirmado pela auditoria.                                     |
| Clientes e Contatos     | Legenda à esquerda; chips na mesma linha com intervalo de12px, centralizados como antes. Novo cadastro continua em linha própria.     |
| Visitas                 | Conferida; agendamento e ações existentes preservados.                                                                                |
| Kits                    | Editar e Usar como padrão agrupados em duas colunas, sem mudar a confirmação humana ou as permissões.                                 |
| Insumos                 | Salvar/Limpar ou Cancelar na mesma linha; voltar para Fichas alinhado ao texto.                                                       |
| Fichas                  | Insumos/Compras e Salvar/Limpar ou Cancelar em pares. Acesso à calculadora continua destacado.                                        |
| Calculadora por peso    | Fichas anteriores alinhado ao texto. Custos, detalhes expansíveis e grupos existentes preservados.                                    |
| Lembretes               | Salvar/Limpar ou Cancelar em pares. Responsáveis/avisos mantêm as escolhas anteriores.                                                |
| Financeiro e conta      | Conferidos; recebimentos, crédito, cobrança e confirmações mantêm os grupos próprios, sem misturar ações financeiras.                 |
| Relatórios              | Conferidos; filtros/CSV permanecem nos grupos existentes.                                                                             |
| Mais                    | Grade existente preservada.                                                                                                           |
| Preferências            | Ações de câmera/galeria e salvar/cancelar foto em pares; temas, nome e avisos preservados.                                            |
| Acessos                 | Conferida; única ação de autorização preservada, sem alteração de papéis.                                                             |
| Backup                  | Conferida; única ação de download preservada. Nenhum backup privado criado pela auditoria.                                            |
| Menu +                  | Grade2×2: Nova visita / Novo pedido; Novo cliente / Novo lembrete. Mesmas rotas/condições de permissão, botões iguais com mínimo64px. |

Os pares usam a classe compartilhada `action-pair`, com tokens, duas colunas e altura mínima48px. O texto pode ocupar mais linhas; não é cortado para forçar uma altura. Os demais grupos não recebem essa regra.

## Evidências e validação

Capturas em `docs/colaboracao/capturas/t7-*.png`: 27 pares antes/depois, duas imagens adicionais de montagem/sabor comprido e uma captura intermediária da montagem antes de compactar suas ações (o selo já estava novo). Valores/custos/clientes são fictícios dos fixtures locais; não vêm do banco real.

```bash
npm run build:pages
npm test -- --maxWorkers=2
npm run lint
npm run format:check
npm run test:brand
npm run test:security
npx playwright test tests/e2e/t7-pre-release.spec.js
```

Para repetir só as imagens depois: `T7_CAPTURE=depois npx playwright test tests/e2e/t7-pre-release.spec.js --project=chromium-mobile`. As imagens antes foram feitas sobre0.18.0; não repetir `T7_CAPTURE=antes` na versão atual.

O E2E cobre sessão retida, fundo dos manifestos, temas/reduced-motion,401, falha de rede e recuperação, grade/atalho/cancelamento sem cadastro, filtros, todos os percursos da tabela, pares/alvos, selo ao lado do nome curto e abaixo do nome comprido sem overflow. As regressões abrangem T3/T6, login/duas sessões/logout, kits no celular e PC, confirmação do padrão em massa, foto privada, sessão expirada, CSP e AppUpdate.

## Limitações e pendências

Sem teste físico de splash nativa instalada em Android/iOS. O sistema decide quando aplica a cor do manifesto; a correspondência foi verificada no navegador. Não foi executado todo estado possível de cada módulo (por exemplo, fechamento financeiro ou restauração de backup); os fluxos e permissões não foram alterados.

CI completo + Segurança são os automáticos do PR. Aguardar revisão e publicação do Claude; sem merge pelo Codex. Novidades permanece oculta antes de1.0.0. A T8 e o cadastro dos kits no banco real continuam fora desta entrega.

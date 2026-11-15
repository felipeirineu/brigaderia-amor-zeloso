# R17 — continuidade da sessão e manutenção

Implementação no branch `codex/r17-session-continuity`, para revisão e publicação pelo Claude com aprovação do responsável. Nenhuma migração, deploy, flag ou operação Cloudflare/D1 nesta entrega. R16/0023 já foram aprovadas/aplicadas pelo responsável, conforme Histórico15/11(1).

## Seleção do pedido após expiração

O Modo simples guarda a seleção no sessionStorage da aba, separada por organização e usuário. Somente IDs e quantidades de cliente/pedido/itens, composição mista e kits entram na whitelist. Nomes, endereço, observações, data, preços, custos, condições e aceite de pedido repetido não são guardados.

Depois de entrar novamente, escolha **Retomar seleção** e **Recuperar seleção**. O app relê cliente/catálogo; se algo estiver indisponível, mantém o rascunho e pede revisão ou descarte. Uma seleção válida volta para Sabores, e data/entrega/pagamento precisam ser conferidos. Em um pedido existente, dados já salvos são relidos do servidor e as regras de edição/CAS continuam valendo. Confirmar outro pedido no mesmo dia exige novamente o botão de aviso vigente; esse aceite nunca vem do rascunho.

Enviar com sucesso, **Descartar seleção** ou sair explicitamente da conta apaga a própria seleção. Existe uma seleção pendente por usuário/organização nesta aba; iniciar outra pode substituí-la. Não há compartilhamento entre aparelhos, garantia de backup, preço congelado ou fila offline. Bloqueio do storage pelo navegador não impede o fluxo normal, mas impede recuperar a seleção depois de perder a tela. O usuário deve conferir se um envio anterior foi registrado quando a conexão cai; não há reenvio automático.

## Rotas e avisos

A demonstração `/app` e `modules.ts` foram removidos. Raiz e manifesto continuam em `/gestao`; login, catálogo desligado, ícones, skip-link e registro do service worker preservados. Offline abre somente o shell e informa que não pode enviar alterações. Dados privados não entram no cache.

Avisos mostram a validade da sessão do aparelho retornada pelo servidor. Sessão expirada, logout ou acesso revogado interrompem o vínculo; o cron também reconfere autorização e vínculo na equipe antes de enfileirar e antes de enviar. Um aviso já despachado pode chegar. Conferir a ativação ao entrar de novo. Ver [R6](FASE_R6_LEMBRETES.md). Sessão deslizante opcional permanece adiada.

## ZAP e segurança

Triagem dos avisos anteriores registrada em CODEX_PARA_CLAUDE: Maps no bundle, namespace XML público de planilha, detecção de SPA e metadados Sec-Fetch do cliente sintético. Regras informativas ignoradas têm justificativa em `.zap/rules.tsv`; nenhuma exceção para autenticação, CSP, exposição de dados ou CSRF foi introduzida.

COOP `same-origin`, COEP `require-corp` e CORP `same-origin` complementam os cabeçalhos estáticos. Recursos do app continuam locais; CSP sem inline/eval ou fontes externas. O validador de rascunho usa modo sem geração de código, inclusive sem o probe de Function. `fail_action: true` foi habilitado depois do baseline local limpo (exit0,0 FAIL,0 WARN,60 PASS,2 informativos ignorados;36 URLs), com `-a -j` no build estável e cabeçalhos reais. O alvo foi exclusivamente o runtime local, nunca produção. A matriz de API cobre separadamente autenticação/tenant/papéis; ZAP não substitui essa cobertura.

## Escopo e verificação

Itens2/3/5/7 compõem esta fase. Item1 continua atendido pelo importador existente;6 já avaliado, sem coluna de número parcialmente ligada;4 adiado. Kit padrão em massa, tema/mascote e endereço estruturado do main foram preservados. Componentes novos usam tokens de theme.css; sem backdrop-filter.

Aceite: expiração real e novo login, repetido exigindo novo aceite, misto+kit, isolamento de usuário, storage mínimo/corrompido/bloqueado, descarte/logout/envio, validade privada e ausência de sessão expirada na lista de aparelhos. Manifesto, raiz, login/catálogo e shell offline continuam testados. Testes funcionais usam CSP real; aparelho físico e homologação privada ficam para o responsável. Evidências finais e checks constam no relatório do canal de colaboração.

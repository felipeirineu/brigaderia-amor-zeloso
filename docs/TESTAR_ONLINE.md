# Testar a demonstração online — Cloudflare Pages

Esta publicação é somente a demonstração da Fase 0, sem login funcional, dados reais ou banco remoto. A interface poderá ser acessada por qualquer pessoa que tenha o endereço; não cadastrar nem incluir informações sensíveis. O catálogo permanece indisponível, inclusive na API. Publicação depende de conectar sua conta Cloudflare; preparar o código não cria um endereço online.

## Publicar pelo GitHub

1. Entre no painel Cloudflare com sua conta e abra **Workers & Pages**.
2. Escolha criar uma aplicação **Pages** e a opção de importar/conectar um repositório Git. Os nomes dos botões podem variar; não selecionar um deploy de Worker usando o `worker/wrangler.jsonc` local.
3. Autorize a integração GitHub apenas para `felipeirineu/brigaderia-amor-zeloso`. O repositório pode permanecer privado; a demonstração publicada será pública.
4. Selecione a branch `main` e configure:

| Campo                            | Valor                              |
| -------------------------------- | ---------------------------------- |
| Preset                           | Nenhum / None                      |
| Diretório raiz                   | Raiz do repositório (deixar vazio) |
| Comando de build                 | `npm run build:pages`              |
| Diretório de saída               | `dist`                             |
| Variável de build `NODE_VERSION` | `24`                               |

5. Não adicionar banco D1, R2, domínio pago nem credenciais. A demonstração não requer essas configurações. Verifique a oferta gratuita e os limites exibidos na conta; não habilitar upgrade pago.
6. Inicie o deploy e aguarde sucesso. Use o endereço HTTPS `pages.dev` apresentado pelo painel. Não há endereço conhecido antes desse passo.

A integração do Pages constrói os próximos commits enviados à `main`. A CI do GitHub valida o código separadamente; o Pages não espera automaticamente a aprovação dessa CI. Antes de dados reais, exigir controles de promoção/deploy e autenticação apropriados.

## Roteiro de teste

- Abra `/app`: deve aparecer “Ambiente de demonstração”.
- Navegue por clientes, produtos, pedidos, produção, entregas, financeiro e configurações; recarregue uma rota interna.
- Confira `/catalogo`: deve informar catálogo indisponível; `/login` deve informar que não há login implementado.
- Abra `/api/health`: retorna o estado do scaffold, sem banco conectado.
- `/api/customers` deve retornar HTTP 401 e `/api/catalogo`, HTTP 404, em JSON.
- No celular, abra o endereço HTTPS. No Android, procure a opção de instalar no menu do Chrome; no iPhone, use Safari → Compartilhar → Adicionar à Tela de Início. Disponibilidade e texto variam por versão.
- Após carregar online e ver o aviso de disponibilidade offline, desligue a conexão e reabra a demonstração. O shell deve funcionar somente para leitura. Não há gravação ou sincronização.
- Quando houver nova versão, o aviso de atualização deve permitir recarregar a aplicação.

## Estrutura da publicação

`npm run build:pages` gera os assets, manifest e service worker e depois cria `dist/_worker.js` (Pages em modo avançado) e `_routes.json`. Apenas `/api` e `/api/*` invocam o Worker, que nega acesso privado e mantém o catálogo bloqueado. O restante é estático, com fallback SPA padrão do Pages; não há `404.html` customizado. O Worker da demonstração não usa D1.

`public/_headers` define cabeçalhos de segurança para assets estáticos. Respostas da API recebem seus próprios cabeçalhos e `no-store`. `_worker.js` é gerado depois do precache, portanto não é disponibilizado pelo cache do service worker.

Para ensaiar localmente o pacote final:

```bash
npm ci
npm run build:pages
npm run preview:pages
```

Não usar `npm run worker:dev` para publicar: ele é o esqueleto local documentado na Fase 0. As decisões de autenticação, banco de produção e hospedagem definitiva ficam para fases posteriores.

## Se houver falha

- Repositório não aparece: revisar permissão da integração Cloudflare no GitHub, sem tornar o repositório público.
- Build falha: conferir Node 24, comando `build:pages`, saída `dist` e logs sem divulgar segredos.
- API retorna HTML: conferir que foi usado `build:pages` e que `_worker.js` e `_routes.json` estão no output.
- Instalação não aparece: conferir HTTPS, manifesto, navegador e ausência de instalação anterior. Homologação em aparelhos reais segue pendente.
- Não inserir tokens em arquivos ou no chat. A integração GitHub do Pages evita a necessidade de enviar credenciais ao agente.

A configuração raiz `wrangler.jsonc` é exclusiva do Pages, sem D1. A configuração do Worker/D1 local fica em `worker/wrangler.jsonc`; os scripts npm selecionam o arquivo correto.

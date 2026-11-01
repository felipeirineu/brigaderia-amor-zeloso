# Localização, transporte e deslocamentos — R4

## Produzido

- Cliente: endereço/bairro e GPS por uma leitura explícita. Busca do estabelecimento por Photon no Worker, com sugestões revisáveis, identificação do app, cache privado de 24 h e bloqueio global de requisições com intervalo de 1,1 s. Nenhuma chamada a Google Places.
- Foto: câmera/galeria, redução WebP no navegador para até 256 px e 40 KB, remoção de metadados pelo canvas. API privada, CAS e trilha de auditoria; sem cache offline ou catálogo. Remoção disponível.
- Instagram: perfil normalizado, somente abertura manual. Base privada vazia, cadastrada pelo administrador; haversine rotulada como linha reta. Hoje permite ordenar por proximidade da base; não é roteirização.
- Coordenadas no pedido são snapshot: novos pedidos copiam quando o endereço corresponde ao local revisado. Alterar cadastro não move entregas anteriores; mudar endereço limpa o snapshot até haver correspondência revisada.
- Uber universal, Maps e Waze por toque; retorno à base. Para 99: copiar destino e abrir o site. Confira o destino no aplicativo.
- Deslocamento humano com meio, trecho, data/hora, valor, responsável, pedidos e observação. Após Entregue (inclusive entrega+recebimento) aparece sheet opcional; também há Mais → Deslocamentos e ação no pedido. Taxa combinada do motoboy só vira despesa quando confirmada como paga.
- Uma transação cria deslocamento e a despesa P1 de categoria entrega. Zero explícito registra deslocamento sem despesa. Repetição idempotente, rateio inteiro proporcional e compensação auditável. Operador estorna só o próprio registro criado hoje; administrador pode estornar os demais. Despesa vinculada deve ser estornada pelo deslocamento.
- Relatório/CSV por período e cliente com custo × faturamento e rateio identificado como estimativa. O custo usa data da corrida; faturamento usa a data combinada de pedidos entregues/retirados. Não é lucro líquido. Estorno compensa o caixa no dia da correção.
- Nome de exibição configurável em Preferências, persistido no perfil e usado nos entregadores. Papéis antigos são mantidos para compatibilidade; se há várias pessoas no mesmo papel, os nomes são apresentados juntos. Deslocamentos permitem escolher o perfil individual; motoboy tem nome livre.

## Custos e políticas antes de ativar

Escolha: BLOB pequeno no D1 existente. Dez fotos ocupam no máximo 400 KB, além do overhead. Um upload substitui a imagem anterior. Evita outro serviço, credencial ou assinatura. Não usar este desenho para fotos originais ou centenas de imagens grandes.

Consulta da documentação em 01/11/2026: D1 Free tem máximo de 500 MB por banco e 5 GB por conta; continuam valendo cotas de linhas lidas/escritas e requisições. Confira consumo em D1 → Metrics e os [limites](https://developers.cloudflare.com/d1/platform/limits/) e [preços](https://developers.cloudflare.com/d1/platform/pricing/). R2 é uma alternativa futura de objetos, com cotas e cobrança próprias; **não foi criado nem ativado**. Não há promessa de uso ilimitado/gratuidade além das cotas do plano.

[Photon](https://github.com/komoot/photon#public-demo-server) oferece servidor público sem chave para uso razoável, sujeito a bloqueio, limites e indisponibilidade, sem garantia de serviço. O app usa busca explícita, trava de cliques/intervalo, cache e limite global no D1. Atribuição © OpenStreetMap fica visível. Nominatim não é usado para autocomplete. Se houver bloqueio/erro, preencha manualmente; nenhum provedor pago é acionado como fallback. Endereço buscado é enviado ao Photon; a foto não sai do D1. O adaptador isolado em worker/places-provider.ts permite substituição futura revisada.

Links: [Uber setPickup](https://developer.uber.com/docs/deep-linking-action-setpickup), [Maps URLs](https://developers.google.com/maps/documentation/urls/guide), [Waze deep links](https://developers.google.com/waze/deeplinks). Sem esquema não documentado da 99. Links podem abrir a versão web se o app não estiver instalado; o usuário ainda confirma corrida/destino no serviço.

## Testes executados

48 unitários, integração R4 com versão/isolamento/foto privada/snapshot/rateio/despesa única/estorno, regressões R2/P1 e build/tipagem/lint. E2E de localização por toque com coordenadas fictícias, compressão de foto, perfil e registro após entrega passaram em Chromium mobile/desktop e WebKit mobile. Rodada completa: 38 E2E aprovados após ajustar três asserções antigas de zero inicial ao contrato R3; um teste offline WebKit permaneceu ignorado. Provedor simulado nos testes; nenhuma busca de cliente real foi feita.

## Ativação — passos curtos

Faça primeiro backup e ensaio de restauração de ATIVACAO.md. Não execute comandos SQL avulsos no console.

1. No PowerShell, abra a pasta do projeto. Execute:

   ```powershell
   git pull --ff-only origin main
   npm ci
   npx wrangler login
   npm run ops:preflight -- --remote brigaderia-amor-zeloso-homologacao
   ```

   Esperado: lista de migrações, contagens e zero foreign_key_violations. Antes da atualização, 0010/0011 podem aparecer pendentes. Erro de login/conta/banco: pare, entre na conta correta e repita somente a consulta. Se 0001/0002 aparecerem pendentes em banco preenchido, pare para reconciliar o histórico.

2. Com backup restaurado em local separado e ninguém cadastrando, execute:

   ```powershell
   npx wrangler d1 migrations apply brigaderia-amor-zeloso-homologacao --remote --config wrangler.jsonc
   npm run ops:preflight -- --remote brigaderia-amor-zeloso-homologacao
   ```

   Esperado: pendentes aplicadas uma vez, incluindo 0003 → 0004 → 0005 → 0006 → 0007 → 0008 → 0009 → 0010 → 0011; depois pending vazio, FKs zero, contagens antigas preservadas e schema_field_ready true. Se houver erro: mantenha as flags false, preserve a mensagem sem dados pessoais e pare. Não use DROP, reset ou reaplique fragmentos de SQL.

3. Abra `wrangler.jsonc`. Altere **somente uma flag por vez**, de `"false"` para `"true"`: OPERATIONS_ENABLED → FINANCE_ENABLED → P1_ENABLED → MOBILE_ENABLED → FIELD_ENABLED. A cada alteração, salve e execute:

   ```powershell
   git add wrangler.jsonc
   git commit -m "config: ativar modulo validado em homologacao"
   git push origin main
   ```

   Esperado: CI verde e deploy Cloudflare concluído para esse commit. Teste o módulo antes da próxima flag. Este arquivo é a fonte das variáveis, portanto não misture alterações só no painel. PUBLIC_CATALOG_ENABLED continua false. Erro: volte apenas a última flag para false, faça outro commit/push e aguarde deploy. Flags não apagam dados.

4. Mais → Preferências: cada pessoa salva seu nome de exibição. O administrador configura endereço/GPS da base. Em um cliente de demonstração, preencha contato/endereço, toque em Usar minha localização, confira e salve. Esperado: linha reta e foto privada; negar GPS deve permitir preencher manualmente. Se falhar, não conceda permissão permanente por tentativa: use o endereço manual e registre a mensagem.

5. Crie um pedido de demonstração, revise endereço, conclua a entrega e registre uma corrida fictícia. Esperado: uma despesa na categoria entrega e no relatório. Reabrir/repetir não deve duplicar. Depois estorne com motivo. Erro: atualize a tela e confira histórico/saldo antes de tentar novamente com outro lançamento.

## Limitações e pendências de homologação

Ativação/banco remoto não alterados nesta entrega. Câmera, GPS real e abertura dos apps Uber/99/Maps/Waze em iPhone Safari/PWA e Android físicos ainda precisam de homologação; os E2E validam UI/URLs com dados fictícios, não solicitam corrida nem comprovam abertura de app instalado. Busca gratuita pode ter baixa cobertura; preenchimento manual sempre disponível. O botão da 99 exige copiar e abrir por ação humana. Sem rastreamento contínuo, rota otimizada ou serviço pago.

Seleção da tela Deslocamentos usa até 200 pedidos; pedido antigo pode ser aberto individualmente. Listagem de custos tem limite de 1000 no período (reduzir o período se exceder). Ordenação por proximidade usa até 1000 snapshots recentes; pedidos sem coordenadas ficam no fim. Backup SQL inclui fotos e dados privados e deve permanecer fora de Git/chat.

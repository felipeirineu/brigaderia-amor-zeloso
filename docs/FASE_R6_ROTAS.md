# R6-1 — Estimativas de rota de carro

Implementação preparada; a ativação remota é feita pelo responsável. Nenhum serviço pago é necessário. Sem a configuração abaixo, o app mantém a distância explicitamente identificada como linha reta.

## Ativação posterior, pelo responsável

1. Siga [Ativação](ATIVACAO.md): backup privado, migrações pendentes e pré-checagem. A **0014_routes.sql** cria somente cache, fila e contador técnico; não muda pedidos nem despesas. Esperado: `pending: []`, `foreign_key_violations: 0` e `schema_routes_ready: true`. Se houver erro, pare antes de ativar o provedor; preserve o backup e o erro sem publicar dados pessoais.
2. Crie uma chave **Standard gratuita** em <https://account.heigit.org/signup>, pelo caminho indicado em <https://openrouteservice.org/>. Não escolha serviço pago. Prefira chave dedicada a este app: chamadas de outros aplicativos também consomem a cota. Se o plano gratuito ou os termos mudarem, pare e revise antes de contratar qualquer coisa.
3. No projeto Pages, em **Settings → Variables and Secrets → Production**, adicione `ORS_API_KEY` como **secret criptografado** e `ROUTING_PROVIDER` como variável com valor `ors`. Nunca use prefixo `VITE_` nem coloque a chave no Git, interface ou chat. A ativação requer nova publicação humana para as variáveis chegarem ao Worker. As flags anteriores continuam seguindo a ordem do guia; esta configuração não habilita módulos por conta própria.
4. Entre como administrador. Cadastre a base em **Mais → Empresa**, estando no local, e confira o ponto. Cadastre um cliente de teste pela interface e confirme suas coordenadas. Esperado: cartão com km, minutos de carro e data do cálculo. Estes dados não são trânsito em tempo real. Nenhum endereço comercial deve ser colocado no código ou nos documentos.
5. Se houver vários clientes, ao salvar a base a tela processa a fila, uma rota por requisição, até 50 por tentativa. A fila persistida permite continuar em **Empresa → Calcular próximas rotas**. Se restarem pendentes, espere o intervalo indicado pelo serviço e tente depois. Pode levar alguns segundos por cliente; não é necessário salvar o endereço novamente.
6. Se aparecer somente linha reta, confirme coordenadas, migração e as duas variáveis no ambiente correto. Confira a cota no painel privado do ORS. O botão **Calcular rota/Recalcular rota** do cliente é exclusivo do administrador. Falhas não desfazem o cadastro; a fila espera uma hora antes de tentar novamente. Abrir telas não chama o provedor.

Para desabilitar novas chamadas, remova `ROUTING_PROVIDER` e faça a publicação humana usual. Cache existente pode continuar aparecendo quando as coordenadas coincidirem. Para testar ausência de configuração, use cadastro de teste ainda sem estimativa; não apague dados reais.

## Contrato, limites e privacidade

- Adaptador no Worker: `POST /v2/directions/driving-car/json`, apenas pares longitude/latitude da base e destino. Sem nome, telefone ou texto de endereço enviados ao provedor. Timeout de oito segundos; redirecionamentos não são seguidos, para não repassar a chave. Respostas inválidas ou indisponibilidade preservam o cadastro e o fallback.
- A chave fica exclusivamente no ambiente do Worker. O cache privado contém `route_km`, `route_minutes`, `route_provider` na resposta e `route_computed_at`. A chave de cache considera perfil/provedor, base e destino. Mudanças invalidam a associação anterior; respostas em andamento só são publicadas se ainda corresponderem às coordenadas atuais.
- Destino de pedido preserva seu snapshot: alterar o cliente não move pedidos antigos. Uma estimativa sem correspondência exata não aparece como atual. O administrador recalcula o endereço atual do cliente.
- Limite interno global: 1.000 tentativas por janela de 24 h, iniciada na primeira tentativa, com intervalo mínimo de 3,1 s entre chamadas. A reserva é atômica entre invocações e organizações. Falhas também contam. Isto é inferior à cota Standard documentada de 2.000 direções/24 h e 40/min; não garante cota disponível se a chave for compartilhada. O provedor pode recusar chamadas.
- Coordenadas coincidentes usam cache sem nova chamada, mesmo entre clientes da mesma organização. Nenhum dado cru do provedor, chave ou erro é registrado no log. Atribuição openrouteservice/HeiGIT e OpenStreetMap aparece junto à estimativa.
- Proximidade: pedidos com rota calculada primeiro, ordenados por minutos; sem rota, distância em linha reta quando possível. O aplicativo de mapas calcula a navegação a partir da localização do próprio aparelho; o app de gestão não rastreia.
- Backup inclui o schema técnico, mas exclui cache/fila e contador global de cota. Após restauração local, salvar os locais ou recalcular repõe estes metadados derivados. Não restaure um backup em produção por tentativa.

Fontes consultadas em 02/11/2026: [plano gratuito](https://openrouteservice.org/), [FAQ e cotas](https://giscience.github.io/openrouteservice/frequently-asked-questions), [Directions](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/). Não foi criada conta nem configurada chave real nesta entrega. Provedor abstraído no Worker; trocar o adaptador exige revisar termos/atribuição/limites e o identificador do provedor, sem alterar o contrato de cliente/pedido.

## Validação desta entrega

D1 efêmero e provedor simulado: cache, repetição de recálculo, snapshots, mudança concorrente da base, falha e espera, limite de cota, autorização, isolamento e FKs. E2E verifica cartões, ajuda, fallback e ausência de chamadas ao abrir telas. A conectividade com uma chave real e as distâncias comerciais devem ser verificadas pelo responsável após ativação; não foram simuladas como resultado de produção.

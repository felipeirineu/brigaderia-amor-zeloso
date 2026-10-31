# Segurança, operação e transferência

## Segurança obrigatória
- HTTPS; cookies HttpOnly/Secure/SameSite; proteção de CSRF para sessões por cookie, CORS restrito, rate limits e bloqueio progressivo de tentativas de login.
- Hash de senha com biblioteca madura e configurações compatíveis com Workers; nunca plaintext, hashes simples ou segredo embutido no frontend.
- Autorizar cada ação no servidor por usuário, função e organização; testar IDOR entre pedidos/clientes.
- Validação com schemas na entrada e consultas parametrizadas; HTML escapado para mensagens/notas; não permitir XSS.
- Armazenamento mínimo: apenas dados necessários; evitar endereço completo em logs; privacidade por padrão; consentimento para campanhas promocionais.
- Fotos recebidas: limites, MIME validado, armazenamento não público por padrão; uploads autenticados e URLs de acesso restritas quando necessário.
- Segredos somente em Cloudflare/GitHub Secrets, nunca no repositório; `.env.example` sem valores reais.
- Backups com exportação periodicamente verificada, acesso restrito, teste de restauração e política de retenção.

## Operação de custo zero (meta, não garantia)
- Verificar limites e condições vigentes de Cloudflare Workers, D1, Pages/Static Assets e R2 antes do deploy.
- Preferir recursos dentro da camada gratuita; configurar alertas/limites de consumo onde oferecidos.
- GitHub privado permite guardar código sem exposição; GitHub Pages não é backend.
- Nenhum serviço pago, domínio, integração de cobrança ou API WhatsApp ativado sem consentimento.

## LGPD e boas práticas
- Informar proprietários sobre tratamento dos dados, finalidade de pedidos e atendimento, política de retenção, atendimento de solicitações e compartilhamento restrito.
- Não importar conversas, contatos ou listas do WhatsApp sem autorização e necessidade.
- Não enviar marketing sem base legal apropriada e mecanismo de oposição.
- Exportação/correção/exclusão com respeito a obrigações legais de conservação de registros.

## Transferência do presente
- GitHub: transferir repositório para proprietário e validar colaboradores/ações/segredos.
- Cloudflare: criar ou migrar serviços para conta da empresa; avaliar migração de banco D1/R2 e domínio separadamente (transferência de repo não transfere infraestrutura).
- Trocar credenciais e tokens no ato da entrega; remover acessos temporários não necessários.
- Fornecer documentação de deploy, restauração de backup, custo, manutenção, contatos técnicos e privacidade.

## Riscos principais
- Plano gratuito suspenso/alterado → backups e instruções de migração.
- Mau funcionamento de offline → app marca claramente modo somente leitura; proibir gravações não sincronizadas.
- Envio acidental de mensagem → geração apenas após clique e revisão pelo operador.
- Dados comerciais inferidos → valores fictícios identificados e publicação travada.
- Inconsistência financeira → centavos inteiros, eventos de pagamento, testes e histórico.

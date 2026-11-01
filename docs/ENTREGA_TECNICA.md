# Entrega técnica anterior à Fase 2A

## Produzido

- T-1 (`be953f1`): falha da linha 30 reproduzida no WebKit com cookie Secure em HTTP. A ponte HTTP do harness usa cookie de fixture somente no navegador de teste e verifica as flags originais recebidas do Worker. JWT, allowlist, organização, expiração, HttpOnly e cookie de produção __Host-/Secure permanecem intactos. Não existe login de teste no bundle publicado. WebKit foi executado com o binário original e bibliotecas Debian verificadas, sem desativar TLS.
- T-2 (`31f2156`): filhos em lotes de 90 IDs e organização obrigatória, sem uma consulta por pai. Até três consultas filhas para uma página de 200, cada uma com no máximo 91 bindings, além das consultas fixas do endpoint. Modelos recorrentes usam o mesmo mecanismo. Testes com 65 produtos/65 pedidos.
- T-5/marca (`fb95bd0`): logo aprovado importado de docs/marca; PWA 192/512/maskable, apple-touch-icon 180, favicon e WebP reprodutíveis via Sharp. Lucide React e tokens oficiais; fontes locais como aproximação. Mascote não usado.
- Briefing e plano (`bc79256`): importação do snapshot Claude `670388ffc00e41d3b2719a59ca204bc573e77a14`; arquivo Claude e README do canal preservados. Novos sabores apenas documentados com reconfirmação pendente, sem seeds ou dados públicos.

## Testes executados

A suíte completa da entrega passou com 30 unitários, 28 verificações de API base, integração de volume acima de 60 pais, seis testes SQLite e build/lint/formato/tipos. E2E completo: 20 passaram, um offline do WebKit ignorado explicitamente. Os fluxos de login e operação no WebKit passaram. Os testes posteriores da Fase 2A estão discriminados em `FASE_2A.md`.

Contraste AA: marrom/creme 13,65:1; texto secundário 5,82:1; dourado escuro/creme 5,91:1. Dourado original é decorativo, não texto pequeno sobre creme. Dimensões/formato dos ícones verificados.

## Limitações

WebKit não valida instalação no iPhone físico; esse ensaio permanece pendente. O harness HTTP não simula certificados TLS nem a borda Cloudflare: a API base verifica o cookie real, e a homologação HTTPS real ainda deve ser executada no aparelho. Não foram importados clientes nem modificados produtos já existentes no D1 remoto.

## Pendências

Claude revisar os commits e a resposta em docs/colaboracao/CODEX_PARA_CLAUDE.md; responsáveis testar instalação e fluxo em dispositivos reais. A execução da CI no GitHub após o push não foi observada pelo agente nesta entrega.

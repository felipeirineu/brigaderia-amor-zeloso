# Atualizações de dependências — R14

## PR #2 (npm)

Falha confirmada no `npm ci`: TypeScript 7.0.2 exige uma combinação ainda incompatível com o peer `>=4.8.4 <6.1.0` do typescript-eslint 8.72.1. O Dependabot passa a ignorar apenas atualizações **major** do TypeScript. Correções e minors continuam elegíveis, assim como as demais dependências.

Depois de publicar a configuração, aguardar o Dependabot atualizar/recriar o grupo sem TypeScript 7. Não integrar o PR antigo vermelho, não usar `--force` ou `--legacy-peer-deps`. No PR regenerado, conferir diff de package/lock, `npm ci`, lint/tipos/testes/build, CI e Segurança antes do merge.

## PR #1 (Actions)

O job “Novas dependências no PR” falhou com:

> Dependency review is not supported on this repository. Please ensure that Dependency graph is enabled.

Não é corrigido com alteração de YAML nem permissões mais amplas. O administrador do repositório deve:

1. Abrir [Settings → Code security](https://github.com/felipeirineu/brigaderia-amor-zeloso/settings/security_analysis).
2. Na seção **Dependency graph**, clicar **Enable** (se estiver ligado, verificar disponibilidade do recurso para o repositório).
3. Voltar ao PR #1 → Checks → execução de Segurança → **Re-run failed jobs**.
4. Resultado esperado: “Novas dependências no PR” verde. Se repetir a mensagem, manter o PR aberto e copiar apenas a mensagem de erro para análise; não compartilhar tokens.
5. Conferir a validação do SHA atual do PR e os demais checks. Atualização de Actions não é autorização para executar o workflow manual do D1.

Sem `continue-on-error`, sem desativar a revisão de dependências e sem merge de checks vermelhos. As Actions propostas com runtime Node 24 serão integradas somente após essas validações. O agente não alterou configurações do GitHub ou do Cloudflare.

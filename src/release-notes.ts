// Fonte única do histórico exibido no app. Até três itens, sem dados comerciais.
export const releaseNotes = [
  {
    version: '1.0.0',
    title: 'Bem-vindos ao app da Brigaderia Amor Zeloso',
    items: [
      'Comece pelo Hoje: confira produção, entregas e lembretes.',
      'Prepare pedidos, acompanhe clientes e registre pagamentos.',
      'Agende visitas e amostras; confira as mensagens antes de abrir o WhatsApp.',
    ],
  },
  {
    version: '0.20.0',
    items: [
      'Preparação da ativação de avisos pelo GitHub, com conferência antes de ligar.',
    ],
  },
  {
    version: '0.19.0',
    items: [
      'Abertura com a marca e aviso de álcool mais compacto.',
      'Menu de atalhos em grade e ações dos formulários mais próximas.',
    ],
  },
  {
    version: '0.18.0',
    items: [
      'Cadastros, escolhas com avatar e ações de retomar pedido mais claros no celular.',
      'Logo com contorno no tema escuro.',
    ],
  },
  {
    version: '0.17.0',
    items: ['Escolha aparência automática, clara ou escura em Preferências.'],
  },
  {
    version: '0.16.0',
    items: [
      'Nova visita direto no +, também para apresentar novos sabores a clientes atuais.',
      'Ajuda passo a passo sobre contatos, amostras e visitas.',
    ],
  },
  {
    version: '0.15.0',
    items: [
      'Confira custos estimados das amostras e corridas.',
      'Registre despesas de prospecção somente quando confirmar o pagamento.',
      'Prepare mensagens de retorno e acompanhe as conversões no relatório.',
    ],
  },
  {
    version: '0.14.0',
    items: [
      'Agende visitas de apresentação no Hoje.',
      'Registre amostras entregues e confira as unidades na produção.',
    ],
  },
  { version: '0.13.1', items: ['Contatos disponíveis na gestão.'] },
  {
    version: '0.13.0',
    items: [
      'Acompanhe contatos por etapas e preserve o histórico quando virarem clientes.',
    ],
  },
  {
    version: '0.12.0',
    items: [
      'Veja uma prévia do conteúdo enquanto as telas carregam.',
      'Arraste as folhas para baixo para fechar.',
    ],
  },
  {
    version: '0.11.1',
    items: ['Títulos com a identidade da marca e nomes longos mais legíveis.'],
  },
  {
    version: '0.11.0',
    items: ['Telefones formatados e mais espaço nas telas do celular.'],
  },
  {
    version: '0.10.0',
    items: [
      'Confira um aviso antes de registrar horário de hoje que já passou.',
    ],
  },
  {
    version: '0.9.0',
    items: [
      'Endereço em campos e aviso quando faltar o número.',
      'Confira a versão do aplicativo em Mais.',
    ],
  },
] as const;
function parse(version: string) {
  const m =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+[\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*)?$/.exec(
      version,
    );
  if (!m) return null;
  const core = m.slice(1, 4).map(Number),
    pre = m[4]?.split('.') ?? [];
  if (
    core.some((n) => !Number.isSafeInteger(n)) ||
    pre.some((s) => /^\d+$/.test(s) && s.length > 1 && s[0] === '0')
  )
    return null;
  return { core, pre };
}
export function compareVersions(a: string, b: string): number | null {
  const x = parse(a),
    y = parse(b);
  if (!x || !y) return null;
  for (let i = 0; i < 3; i++)
    if (x.core[i] !== y.core[i]) return Math.sign(x.core[i] - y.core[i]);
  if (!x.pre.length || !y.pre.length)
    return x.pre.length ? -1 : y.pre.length ? 1 : 0;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const left = x.pre[i],
      right = y.pre[i];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    if (left === right) continue;
    const ln = /^\d+$/.test(left),
      rn = /^\d+$/.test(right);
    if (ln && rn) return BigInt(left) < BigInt(right) ? -1 : 1;
    if (ln !== rn) return ln ? -1 : 1;
    return left < right ? -1 : 1;
  }
  return 0;
}
export const releasesEnabled = (version: string) =>
  (compareVersions(version, '1.0.0') ?? -1) >= 0;
export function shouldAnnounce(version: string, seen: string | null) {
  return (
    releasesEnabled(version) &&
    (!seen || (compareVersions(version, seen) ?? 1) > 0)
  );
}

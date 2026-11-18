import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Voltar do celular como nos apps com menu de abas:
 * - trocar de aba pelo menu de baixo não acumula histórico;
 * - de qualquer aba, Voltar leva ao Hoje; no Hoje, Voltar sai do app;
 * - dentro de uma aba, Voltar continua voltando passo a passo.
 */
const TODAY = '/gestao/';
const isToday = (path: string) => path === '/gestao' || path === TODAY;
const historyIdx = () =>
  (window.history.state as { idx?: number } | null)?.idx ?? 0;
// Posição do Hoje no histórico desta aba (só em memória; nada é guardado).
let todayIdx: number | null = null;
const readToday = () => todayIdx;
const writeToday = (idx: number) => {
  todayIdx = idx;
};

export function useTabHistory() {
  const location = useLocation(),
    navigate = useNavigate();
  // Abriu direto numa tela da gestão (atalho, aviso): coloca o Hoje embaixo,
  // para o Voltar levar ao Hoje antes de sair do app. Endereços com ação
  // (ex.: ?novo=1) mantêm o Voltar próprio da tela.
  useEffect(() => {
    const path = location.pathname;
    if (
      historyIdx() === 0 &&
      !location.search &&
      path.startsWith('/gestao/') &&
      !isToday(path)
    ) {
      const target = path + location.search + location.hash;
      navigate(TODAY, { replace: true });
      navigate(target);
    }
    // Só na abertura do app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (isToday(location.pathname)) writeToday(historyIdx());
  }, [location]);
  return useCallback(
    (to: string, event: { preventDefault(): void }) => {
      event.preventDefault();
      const here = historyIdx(),
        today = readToday();
      if (isToday(to)) {
        if (today !== null && today < here) navigate(today - here);
        else if (!isToday(location.pathname))
          navigate(TODAY, { replace: true });
        return;
      }
      if (isToday(location.pathname)) {
        navigate(to);
        return;
      }
      if (location.pathname === to) return;
      // Volta até a aba logo acima do Hoje e troca por a nova aba.
      const base = today !== null && today < here ? today + 1 : here;
      if (base < here) {
        const onPop = () => {
          window.removeEventListener('popstate', onPop);
          navigate(to, { replace: true });
        };
        window.addEventListener('popstate', onPop);
        navigate(base - here);
        return;
      }
      navigate(to, { replace: true });
    },
    [location.pathname, navigate],
  );
}

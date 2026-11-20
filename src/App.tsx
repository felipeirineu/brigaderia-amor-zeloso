import { Button } from './components/Button';
import { useEffect, useRef } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Login, Management } from './features/Management';
import { ManagementError } from './features/feedback/ManagementError';
import { AppUpdate } from './components/AppUpdate';
import { OfflineStatus } from './components/OfflineStatus';
import { SheetGestures } from './components/SheetGestures';

export function App() {
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    document.title = 'Gestão privada | Brigaderia Amor Zeloso';
    if (previousPath.current !== location.pathname) {
      main.current?.focus();
      previousPath.current = location.pathname;
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <main
        className="private-workspace"
        id="conteudo"
        ref={main}
        tabIndex={-1}
      >
        <Link
          to="/gestao"
          className="private-brand"
          aria-label="Início da gestão Amor Zeloso"
        >
          <img src="/brand/logo.webp" alt="" width="40" height="41" />
          <span>
            Amor Zeloso <small>Gestão</small>
          </span>
        </Link>
        <OfflineStatus />
        <SheetGestures />
        {location.pathname.startsWith('/gestao') && <AppUpdate />}
        <Routes>
          <Route path="/" element={<Navigate to="/gestao" replace />} />
          <Route
            path="/gestao/*"
            element={
              <ManagementError>
                <Management />
              </ManagementError>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route
            path="/catalogo/*"
            element={
              <section className="empty-state">
                <h1>Catálogo indisponível</h1>
                <p>
                  Nenhum produto está publicado. A ativação depende de
                  autorização dos proprietários.
                </p>
                <Button to="/gestao" variant="ghost">
                  Voltar ao início
                </Button>
              </section>
            }
          />
          <Route
            path="*"
            element={
              <section className="empty-state">
                <h1>Página não encontrada</h1>
                <Button to="/gestao" variant="ghost">
                  Voltar ao início
                </Button>
              </section>
            }
          />
        </Routes>
      </main>
    </>
  );
}

import { useEffect, useRef } from 'react';
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { Login, Management } from './features/Management';
import { Icon } from './components/Icon';
import { RuntimeStatus } from './components/RuntimeStatus';
import { demoSteps, modules } from './features/modules';

function Dashboard() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SEU ESPAÇO DE GESTÃO</p>
          <h1>Um cuidado em cada detalhe.</h1>
          <p>Uma base para organizar a rotina e cultivar boas lembranças.</p>
        </div>
        <span className="phase">Fase 0 · Estrutura inicial</span>
      </div>
      <section className="welcome" aria-labelledby="welcome-title">
        <div>
          <p className="eyebrow">O SABOR DAS BOAS LEMBRANÇAS</p>
          <h2 id="welcome-title">
            Tudo começa com uma
            <br />
            base bem preparada.
          </h2>
          <p>
            Explore a demonstração do seu futuro espaço de gestão. Os módulos
            serão construídos em etapas, com segurança e atenção à sua rotina.
          </p>
          <Link className="button" to="/app/configuracoes">
            Ver próximos passos <Icon name="seta" />
          </Link>
        </div>
        <div className="brand-art" aria-hidden="true">
          <img src="/brand/logo.webp" alt="" width="200" height="205" />
        </div>
      </section>
      <section aria-labelledby="areas-title">
        <div className="section-heading">
          <h2 id="areas-title">Sua rotina, organizada</h2>
          <span>Áreas em preparação</span>
        </div>
        <div className="module-grid">
          {modules
            .filter((m) => m.slug !== 'configuracoes')
            .map((m) => (
              <Link className="module-card" key={m.slug} to={`/app/${m.slug}`}>
                <span className="module-icon" aria-hidden="true">
                  <Icon name={m.slug} />
                </span>
                <h3>{m.title}</h3>
                <p>{m.description}</p>
                <span className="card-footer">
                  Explorar estrutura <Icon name="seta" />
                </span>
              </Link>
            ))}
        </div>
      </section>
      <section className="steps" aria-labelledby="steps-title">
        <div className="section-heading">
          <h2 id="steps-title">Preparação do ambiente</h2>
          <span>Exemplos de demonstração</span>
        </div>
        {demoSteps.map((step) => (
          <article className="step" key={step.id}>
            <span className="step-id">{step.id}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </div>
            <span className="badge">{step.status}</span>
          </article>
        ))}
      </section>
    </>
  );
}
function ModulePage({ slug }: { slug: string }) {
  const module = modules.find((m) => m.slug === slug)!;
  return (
    <>
      <p className="eyebrow">GESTÃO · DEMONSTRAÇÃO</p>
      <h1>{module.title}</h1>
      <p className="intro">{module.description}</p>
      {slug === 'configuracoes' ? (
        <section className="panel">
          <h2>Informações a confirmar</h2>
          <p>
            Logo autorizado pelo Felipe. Informações comerciais e operacionais
            aguardam reconfirmação dos proprietários.
          </p>
          <ul className="confirmation-list">
            {[
              'Privacidade do repositório e responsáveis pelo GitHub',
              'Conta Cloudflare, limites gratuitos e permissões',
              'Logo original e autorização de uso',
              'Número comercial de WhatsApp',
              'Horários de atendimento',
              'Regras de entrega e retirada',
            ].map((item) => (
              <li key={item}>
                <strong>{item}</strong>
                <span>TODO-CONFIRMAR</span>
              </li>
            ))}
          </ul>
          <p>
            Idioma: português do Brasil · Moeda: BRL · Fuso: America/Fortaleza
          </p>
          <p>
            <strong>Catálogo público desativado.</strong> Login e edição ainda
            não estão disponíveis.
          </p>
        </section>
      ) : (
        <section className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            <Icon name={module.slug} />
          </span>
          <h2>Este espaço está em preparação</h2>
          <p>
            O módulo de {module.title.toLocaleLowerCase('pt-BR')} será
            implementado na Fase {module.phase}. Não há dados reais nem
            cadastros nesta demonstração.
          </p>
          <Link className="button secondary" to="/app">
            Voltar ao início
          </Link>
        </section>
      )}
    </>
  );
}
function Unavailable({ catalog = false }: { catalog?: boolean }) {
  return (
    <section className="empty-state">
      <p className="eyebrow">
        {catalog ? 'CATÁLOGO DESATIVADO' : 'ACESSO EM PREPARAÇÃO'}
      </p>
      <h1>
        {catalog ? 'Catálogo indisponível' : 'Login ainda não implementado'}
      </h1>
      <p>
        {catalog
          ? 'Nenhum produto está publicado. A ativação depende de autorização dos proprietários.'
          : 'Este ambiente contém apenas uma demonstração pública da interface, sem dados privados ou sessão autenticada.'}
      </p>
      <Link className="button" to="/app">
        Explorar demonstração
      </Link>
    </section>
  );
}
export function App() {
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    const current = modules.find((m) => location.pathname === `/app/${m.slug}`);
    document.title = location.pathname.startsWith('/gestao')
      ? 'Gestão privada | Brigaderia Amor Zeloso'
      : `${current?.title ?? 'Início'} | Brigaderia Amor Zeloso · Demonstração`;
    if (previousPath.current !== location.pathname) {
      main.current?.focus();
      previousPath.current = location.pathname;
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);
  if (location.pathname.startsWith('/gestao'))
    return (
      <main
        className="private-workspace"
        id="conteudo"
        ref={main}
        tabIndex={-1}
      >
        <Link to="/app">Amor Zeloso · Demonstração</Link>
        <Routes>
          <Route path="/gestao/*" element={<Management />} />
        </Routes>
      </main>
    );
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <Link className="brand" to="/app" aria-label="Amor Zeloso — início">
          <img
            className="brand-logo"
            src="/brand/logo.webp"
            alt=""
            width="52"
            height="54"
          />
          <span>
            Amor Zeloso<small>BRIGADERIA · GESTÃO</small>
          </span>
        </Link>
        <p className="nav-caption">ESPAÇO DE TRABALHO</p>
        <nav aria-label="Navegação principal">
          <NavLink to="/app" end>
            <Icon name="inicio" />
            Início
          </NavLink>
          {modules.map((m) => (
            <NavLink to={`/app/${m.slug}`} key={m.slug}>
              <span aria-hidden="true">
                <Icon name={m.slug} />
              </span>
              {m.title}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <Icon name="brilho" />
          <p>
            O sabor das
            <br />
            <strong>boas lembranças.</strong>
          </p>
          <small>Marca autorizada pelo Felipe</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Brigaderia Amor Zeloso <span className="muted">/ Gestão</span>
          </span>
          <Link className="demo-label" to="/login">
            Entrar na gestão
          </Link>
        </header>
        <div className="demo-banner">
          <strong>Ambiente de demonstração.</strong> Conteúdo fictício, sem
          dados reais e sem gravação.
        </div>
        <RuntimeStatus />
        <main id="conteudo" ref={main} tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/app" element={<Dashboard />} />
            {modules.map((m) => (
              <Route
                key={m.slug}
                path={`/app/${m.slug}`}
                element={<ModulePage slug={m.slug} />}
              />
            ))}
            <Route path="/login" element={<Login />} />
            <Route path="/catalogo/*" element={<Unavailable catalog />} />
            <Route
              path="*"
              element={
                <section className="empty-state">
                  <h1>Página não encontrada</h1>
                  <Link to="/app">Voltar ao início</Link>
                </section>
              }
            />
          </Routes>
        </main>
        <footer>
          Amor Zeloso · Gestão com cuidado{' '}
          <span>Fase 0 · Sem conexão com produção</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Navegação móvel">
        <NavLink to="/app" end>
          Início
        </NavLink>
        <NavLink to="/app/clientes">Clientes</NavLink>
        <NavLink to="/app/pedidos">Pedidos</NavLink>
        <NavLink to="/app/configuracoes">Configurações</NavLink>
      </nav>
    </>
  );
}

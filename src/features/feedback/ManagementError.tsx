import {
  Children,
  Component,
  cloneElement,
  isValidElement,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Routes, useLocation } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Mascot } from '../../components/Mascot';
import { feedbackPage, makeErrorCode } from '../../../shared/feedback';
import { api } from '../api';

const knownErrors = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'URIError',
  'AggregateError',
]);

class ErrorBoundary extends Component<
  {
    children: ReactNode;
    fallback: (code: string) => ReactNode;
    page: ReturnType<typeof feedbackPage>;
    navigationKey: string;
  },
  { failed: boolean; code: string }
> {
  state = { failed: false, code: '' };

  static getDerivedStateFromError() {
    return {
      failed: true,
      code: makeErrorCode(new Date(), crypto.randomUUID()),
    };
  }

  componentDidCatch(error: unknown) {
    const name =
      error instanceof Error && knownErrors.has(error.name)
        ? error.name
        : 'Error';
    console.warn('Erro de tela', {
      code: this.state.code,
      version: __APP_VERSION__,
      page: this.props.page,
      name,
    });
  }

  componentDidUpdate(previous: Readonly<{ navigationKey: string }>) {
    if (
      this.state.failed &&
      previous.navigationKey !== this.props.navigationKey
    )
      this.setState({ failed: false, code: '' });
  }

  render() {
    return this.state.failed
      ? this.props.fallback(this.state.code)
      : this.props.children;
  }
}

function ErrorScreen({
  code,
  page,
  available,
}: {
  code: string;
  page: ReturnType<typeof feedbackPage>;
  available?: boolean;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (available !== undefined || page === 'sugestoes') return;
    let active = true;
    void api<{ feedback?: boolean }>('session')
      .then((session) => {
        if (active) setReady(!!session.feedback);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [available, page]);
  return (
    <section className="feedback-result" aria-labelledby="feedback-error-title">
      <Mascot size={150} />
      <h1 id="feedback-error-title">Ops, algo deu errado nesta tela</h1>
      <p>Seus dados estão salvos. Recarregar costuma resolver.</p>
      <Button variant="primary" onClick={() => window.location.reload()}>
        Recarregar
      </Button>
      <Button variant="tonal" to="/gestao" replace>
        Voltar ao Hoje
      </Button>
      {page !== 'sugestoes' && (available ?? ready) && (
        <Button
          className="feedback-report-link"
          variant="ghost"
          to="/gestao/sugestoes"
          replace
          state={{ page, errorCode: code }}
        >
          Contar o que aconteceu
        </Button>
      )}
      <p className="feedback-code">
        Código: {code} · versão {__APP_VERSION__}
      </p>
    </section>
  );
}

export function ManagementError({
  children,
  available,
}: {
  children: ReactNode;
  available?: boolean;
}) {
  const location = useLocation();
  const page = feedbackPage(location.pathname);
  return (
    <ErrorBoundary
      navigationKey={location.key}
      page={page}
      fallback={(code) => (
        <ErrorScreen code={code} page={page} available={available} />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

type RouteProps = { element?: ReactNode; children?: ReactNode };
function protectRoutes(children: ReactNode, available: boolean): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement<RouteProps>(child)) return child;
    const props = child.props;
    return cloneElement(child as ReactElement<RouteProps>, {
      ...(props.element
        ? {
            element: (
              <ManagementError available={available}>
                {props.element}
              </ManagementError>
            ),
          }
        : {}),
      ...(props.children
        ? { children: protectRoutes(props.children, available) }
        : {}),
    });
  });
}

export function ManagementRoutes({
  children,
  available,
}: {
  children: ReactNode;
  available: boolean;
}) {
  return <Routes>{protectRoutes(children, available)}</Routes>;
}

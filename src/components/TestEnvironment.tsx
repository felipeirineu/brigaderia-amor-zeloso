import { createContext, useContext, type ReactNode } from 'react';
import { Button } from './Button';
import { useConfirm } from './confirm-context';

const TestEnvironment = createContext(false);

export function EnvironmentScope({
  test,
  children,
}: {
  test: boolean;
  children: ReactNode;
}) {
  return <TestEnvironment value={test}>{children}</TestEnvironment>;
}

export function TestEnvironmentBanner() {
  const test = useContext(TestEnvironment);
  return test ? (
    <aside className="test-environment-banner" aria-label="Ambiente de teste">
      AMBIENTE DE TESTE · dados não são reais
    </aside>
  ) : null;
}

type WhatsAppProps = {
  href: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  variant?: 'primary';
};

export function WhatsAppLink({ href, children, ...props }: WhatsAppProps) {
  const test = useContext(TestEnvironment);
  const askConfirmation = useConfirm();
  if (!test)
    return (
      <Button href={href} target="_blank" rel="noreferrer" {...props}>
        {children}
      </Button>
    );

  return (
    <Button
      type="button"
      {...props}
      onClick={async () => {
        if (
          await askConfirmation(
            'Você está no ambiente de teste. Abrir o WhatsApp mesmo assim?',
            'Abrir o WhatsApp',
          )
        )
          window.location.assign(href);
      }}
    >
      {children}
    </Button>
  );
}

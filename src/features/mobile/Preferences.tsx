import { Button } from '../../components/Button';
import { ProfileSettings } from '../field/ProfileSettings';
import { useOrderMode } from './useOrderMode';
export function Preferences({ role }: { role: string }) {
  const mode = useOrderMode(role);
  return (
    <section className="panel">
      <h1 className="mobile-context-title">Preferências</h1>
      <ProfileSettings />
      <h2>Como criar pedidos</h2>
      <div className="chips">
        {[
          ['auto', 'Automático'],
          ['simple', 'Modo simples'],
          ['full', 'Modo completo'],
        ].map(([v, label]) => (
          <Button
            key={v}
            aria-pressed={mode.preference === v}
            onClick={() => mode.setPreference(v)}
          >
            {label}
          </Button>
        ))}
      </div>
      <p>
        No automático, a operação usa fotos no celular. O computador abre o modo
        completo. Esta escolha fica apenas neste navegador.
      </p>
    </section>
  );
}

import { FeedbackPhone } from '../feedback/FeedbackPhone';
import { AppearanceSettings } from '../../components/AppearanceSettings';
import { PushSettings } from '../p1/PushSettings';
import { Button } from '../../components/Button';
import { ProfileSettings } from '../field/ProfileSettings';
import { useOrderMode } from './useOrderMode';
export function Preferences({
  role,
  p1 = false,
  feedback = false,
}: {
  role: string;
  p1?: boolean;
  feedback?: boolean;
}) {
  const mode = useOrderMode(role);
  return (
    <section className="panel">
      <h1 className="mobile-context-title">Preferências</h1>
      <AppearanceSettings />
      <ProfileSettings />
      {feedback && <FeedbackPhone />}
      {p1 && <PushSettings />}
      <h2>Como criar pedidos</h2>
      <div className="chips">
        {[
          ['simple', 'Modo simples'],
          ['full', 'Lista completa'],
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
        Modo simples: escolhe os sabores tocando nas fotos. Lista completa:
        mostra todos os produtos numa lista, sem fotos. Esta escolha fica só
        neste aparelho.
      </p>
    </section>
  );
}

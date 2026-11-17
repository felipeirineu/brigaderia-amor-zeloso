import { useEffect, useState } from 'react';
import { Button } from './Button';
import { appearance, changeAppearance, type Appearance } from '../appearance';
export function AppearanceSettings() {
  const [choice, setChoice] = useState(appearance);
  useEffect(() => {
    const applied = () => setChoice(appearance());
    window.addEventListener('az-appearance-applied', applied);
    return () => window.removeEventListener('az-appearance-applied', applied);
  }, []);
  return (
    <section aria-label="Aparência">
      <h2>Aparência</h2>
      <div className="chips" role="group" aria-label="Aparência">
        {[
          ['auto', 'Automático'],
          ['light', 'Claro'],
          ['dark', 'Escuro'],
        ].map(([value, label]) => (
          <Button
            type="button"
            key={value}
            variant="chip"
            aria-pressed={choice === value}
            onClick={() => changeAppearance(value as Appearance)}
          >
            {label}
          </Button>
        ))}
      </div>
      <p>
        No automático, acompanha a aparência do celular. A escolha fica neste
        navegador; se ele não permitir guardar, vale somente enquanto estiver
        aberto.
      </p>
    </section>
  );
}

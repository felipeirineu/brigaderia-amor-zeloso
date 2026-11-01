import { useOrderMode } from './useOrderMode';
export function Preferences({ role }: { role: string }) {
  const mode = useOrderMode(role);
  return (
    <section className="panel">
      <h1>Preferências</h1>
      <h2>Como criar pedidos</h2>
      <div className="chips">
        {[
          ['auto', 'Automático'],
          ['simple', 'Modo simples'],
          ['full', 'Modo completo'],
        ].map(([v, label]) => (
          <button
            key={v}
            aria-pressed={mode.preference === v}
            onClick={() => mode.setPreference(v)}
          >
            {label}
          </button>
        ))}
      </div>
      <p>
        No automático, a operação usa fotos no celular. O computador abre o modo
        completo. Esta escolha fica apenas neste navegador.
      </p>
    </section>
  );
}

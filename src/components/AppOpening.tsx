/** Abertura enquanto a sessão está sendo lida; não antecipa acesso à gestão. */
export function AppOpening() {
  return (
    <section
      className="app-opening"
      role="status"
      aria-label="Carregando a gestão"
    >
      <div className="opening-content">
        <img
          src="/brand/logo.webp"
          alt="Brigaderia Amor Zeloso"
          width="220"
          height="220"
        />
        <div className="opening-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}

import { alcoholNotice } from '../../shared/alcohol';
/** Texto curto visual, com o aviso completo mantido para tecnologias assistivas. */
export function AlcoholTag() {
  return (
    <small className="alcohol-tag" role="img" aria-label={alcoholNotice}>
      <span aria-hidden="true">🍸</span> Álcool
    </small>
  );
}

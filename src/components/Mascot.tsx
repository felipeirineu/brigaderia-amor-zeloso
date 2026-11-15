// Mascote da marca, autorizado pelo proprietário em 15/11/2026. Uso só em
// momentos especiais dentro do app (telas vazias, pedido confirmado, entrada,
// ajuda e passeio). Decorativo: o texto ao lado sempre explica a situação.
export function Mascot({
  size = 96,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      className={`mascot ${className}`.trim()}
      src="/brand/mascote-240.webp"
      srcSet="/brand/mascote-240.webp 240w, /brand/mascote-480.webp 480w"
      sizes={`${size}px`}
      width={size}
      height={Math.round((size * 266) / 240)}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable={false}
    />
  );
}

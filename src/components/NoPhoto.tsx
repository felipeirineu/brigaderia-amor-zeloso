/**
 * Sabor ainda sem foto: forminha vazia com "Sem Foto" escrito pelo próprio app
 * (texto nítido em qualquer tamanho). Em tamanhos pequenos fica só a forminha.
 * Prévia aprovada pelo Felipe em 18/11 (opção 6).
 */
export function NoPhoto({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`no-photo${small ? ' no-photo--small' : ''}`}
      aria-hidden="true"
    >
      <img src="/brand/sem-foto.webp" alt="" width={120} height={120} />
      {!small && (
        <span className="no-photo-text">
          Sem
          <br />
          Foto
        </span>
      )}
    </span>
  );
}

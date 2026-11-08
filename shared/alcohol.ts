// Aviso "Contém álcool": a Caipirinha leva cachaça. Reconhece a foto do sabor
// ou palavras no nome/descrição, para valer também em sabores futuros
// (basta escrever "contém álcool" na descrição do produto).
const words = /caipirinha|cacha[cç]a|licor|[aá]lco(?:ol|[oó]lic)/i;
export function containsAlcohol(
  photoKey?: string | null,
  ...texts: (string | null | undefined)[]
) {
  return photoKey === 'caipirinha' || texts.some((t) => !!t && words.test(t));
}
export const alcoholNotice = 'Contém álcool';

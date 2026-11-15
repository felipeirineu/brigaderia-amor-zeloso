const connectives = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
/** Até duas iniciais significativas, iguais em avatares de locais e da equipe. */
export function nameInitials(name: string): string {
  return name
    .normalize('NFC')
    .trim()
    .split(/\s+/u)
    .filter((word) => word && !connectives.has(word.toLocaleLowerCase('pt-BR')))
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join('')
    .toLocaleUpperCase('pt-BR');
}

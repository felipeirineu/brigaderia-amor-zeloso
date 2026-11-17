// Somente preferências de interface; sem nomes, pedidos ou dados comerciais.
const memory = new Map<string, string>();
export function readLocalPreference(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}
export function writeLocalPreference(key: string, value: string) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Mantém a escolha nesta abertura. */
  }
}

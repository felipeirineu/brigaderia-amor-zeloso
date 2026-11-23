/** Tipo do erro sem dados: tira aspas, e-mails e números longos. */
export function safeErrorText(e: unknown) {
  const raw = e instanceof Error ? `${e.name}: ${e.message}` : 'desconhecido';
  return raw
    .replace(/(["'`]).*?\1/g, '?')
    .replace(/[^\s@]+@[^\s@]+/g, '?')
    .replace(/\d{3,}/g, '?')
    .slice(0, 300);
}

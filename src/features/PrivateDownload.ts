export async function privateDownload(path: string, name: string) {
  if (!navigator.onLine) throw new Error('Reconecte para exportar.');
  const response = await fetch('/api/' + path, {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    throw new Error(error.error || 'Não foi possível exportar.');
  }
  const url = URL.createObjectURL(await response.blob()),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

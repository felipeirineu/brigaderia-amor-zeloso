export async function privateFile(path: string) {
  if (!navigator.onLine) throw new Error('Reconecte para exportar.');
  let response: Response;
  try {
    response = await fetch('/api/' + path, {
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new Error(
      'A conexão caiu antes de baixar o arquivo. Reconecte e tente novamente.',
    );
  }
  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    throw new Error(error.error || 'Não foi possível exportar.');
  }
  return { response, blob: await response.blob() };
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function privateDownload(path: string, name: string) {
  const { blob } = await privateFile(path);
  downloadBlob(blob, name);
}

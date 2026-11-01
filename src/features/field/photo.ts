/** Canvas remove metadados/EXIF; nenhuma foto original é enviada. */
export async function compressPhoto(file: File) {
  if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024)
    throw Error('Escolha uma imagem de até 20 MB.');
  const url = URL.createObjectURL(file),
    image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(Error('Não foi possível ler a imagem.'));
      image.src = url;
    });
    const scale = Math.min(1, 256 / Math.max(image.width, image.height)),
      canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas
      .getContext('2d')!
      .drawImage(image, 0, 0, canvas.width, canvas.height);
    let blob: Blob | null = null;
    for (const quality of [0.8, 0.6, 0.4]) {
      blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', quality));
      if (blob?.type === 'image/webp' && blob.size <= 40960) break;
    }
    if (!blob || blob.type !== 'image/webp' || blob.size > 40960)
      throw Error(
        'Este navegador não gerou WebP de até 40 KB. Tente outra imagem ou navegador.',
      );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return btoa(String.fromCharCode(...bytes));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type BackupDirectory = FileSystemDirectoryHandle & {
  queryPermission: (options: { mode: 'readwrite' }) => Promise<PermissionState>;
  requestPermission: (options: {
    mode: 'readwrite';
  }) => Promise<PermissionState>;
};
type PickerWindow = Window & {
  showDirectoryPicker?: (options: {
    mode: 'readwrite';
    id: string;
  }) => Promise<BackupDirectory>;
};
export function hasBackupPicker() {
  return (
    typeof (window as PickerWindow).showDirectoryPicker === 'function' &&
    !window.matchMedia('(pointer: coarse)').matches
  );
}
export function pickBackupFolder() {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) throw Error('Use Downloads neste navegador.');
  return picker.call(window, { mode: 'readwrite', id: 'amor-zeloso-backups' });
}
async function folderStore() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('az-private-backup-folders', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('folders');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(Error('Não foi possível lembrar a pasta neste navegador.'));
    req.onblocked = () =>
      reject(Error('Feche as outras abas para alterar a pasta.'));
  });
}
export async function readBackupFolder(scope: string) {
  const db = await folderStore();
  try {
    return await new Promise<BackupDirectory | null>((resolve, reject) => {
      const req = db.transaction('folders').objectStore('folders').get(scope);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(Error('Escolha a pasta novamente.'));
    });
  } finally {
    db.close();
  }
}
export async function rememberBackupFolder(
  scope: string,
  directory: BackupDirectory | null,
) {
  const db = await folderStore();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('folders', 'readwrite'),
        store = tx.objectStore('folders');
      if (directory) store.put(directory, scope);
      else store.delete(scope);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () =>
        reject(
          Error(
            'A pasta será usada agora, mas não pôde ser lembrada para a próxima vez.',
          ),
        );
    });
  } finally {
    db.close();
  }
}
export async function writeBackupFile(
  directory: BackupDirectory,
  name: string,
  data: Blob,
) {
  if (!/^backup-gestao-[\w-]+\.sql$/.test(name))
    throw Error('Nome de arquivo inválido.');
  try {
    await directory.getFileHandle(name);
    throw Error(
      'Já existe um arquivo com esse nome. Faça outro backup para preservar o anterior.',
    );
  } catch (e) {
    if ((e as DOMException).name !== 'NotFoundError') throw e;
  }
  const file = await directory.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  try {
    await writable.write(data);
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => undefined);
    throw error;
  }
}

export function backupFileError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError')
      return 'Acesso à pasta não permitido. Permita o acesso ou use Downloads.';
    if (error.name === 'QuotaExceededError')
      return 'Não há espaço para salvar o backup. Libere espaço ou escolha outra pasta.';
    if (error.name === 'AbortError')
      return 'Operação cancelada. O lembrete de backup foi preservado.';
    return 'Não foi possível salvar na pasta. Confira a permissão ou use Downloads.';
  }
  return error instanceof Error
    ? error.message
    : 'Não foi possível salvar o backup.';
}

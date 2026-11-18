import { describe, expect, it, vi } from 'vitest';
import {
  writeBackupFile,
  backupFileError,
  type BackupDirectory,
} from './backup-folder';
const name = 'backup-gestao-2030-01-01-demonstracao.sql';
describe('gravação privada de backup', () => {
  it('recusa colisão antes de abrir escrita; não sobrescreve nem remove o arquivo existente', async () => {
    const createWritable = vi.fn(),
      removeEntry = vi.fn();
    const getFileHandle = vi.fn(async () => ({ createWritable }));
    await expect(
      writeBackupFile(
        { getFileHandle, removeEntry } as unknown as BackupDirectory,
        name,
        new Blob(['DEMONSTRAÇÃO']),
      ),
    ).rejects.toThrow('Já existe');
    expect(createWritable).not.toHaveBeenCalled();
    expect(removeEntry).not.toHaveBeenCalled();
  });
  it('só conclui após close, e aborta o arquivo novo se a escrita falhar', async () => {
    const abort = vi.fn(async () => undefined),
      close = vi.fn(async () => undefined),
      write = vi.fn(async () => {
        throw new DOMException('DEMONSTRAÇÃO', 'QuotaExceededError');
      });
    const getFileHandle = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('DEMONSTRAÇÃO', 'NotFoundError'))
      .mockResolvedValueOnce({
        createWritable: async () => ({ write, close, abort }),
      });
    await expect(
      writeBackupFile(
        { getFileHandle } as unknown as BackupDirectory,
        name,
        new Blob(['DEMONSTRAÇÃO']),
      ),
    ).rejects.toThrow();
    expect(close).not.toHaveBeenCalled();
    expect(abort).toHaveBeenCalledOnce();
  });
  it('erros de permissão/espaço são explicados em português sem caminho privado', () => {
    expect(
      backupFileError(new DOMException('/caminho-privado', 'NotAllowedError')),
    ).toMatch(/Acesso à pasta/);
    expect(
      backupFileError(
        new DOMException('/caminho-privado', 'QuotaExceededError'),
      ),
    ).not.toContain('/caminho-privado');
  });
});

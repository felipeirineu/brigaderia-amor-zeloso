import { expect, it } from 'vitest';
import { requireProductArchive } from './product-policy';
it('arquivamento de produto exige administrador e devolve403 em português', () => {
  expect(() => requireProductArchive('owner')).not.toThrow();
  try {
    requireProductArchive('operator');
    throw new Error('Permissão indevida');
  } catch (error) {
    expect(error).toMatchObject({
      status: 403,
      message: 'Somente o administrador pode arquivar produtos.',
    });
  }
});

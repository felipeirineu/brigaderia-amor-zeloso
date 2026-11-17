import { HttpError, type Actor } from './security';
/** Arquivamento é administrativo; a largura da tela nunca autoriza a API. */
export function requireProductArchive(role: Actor['role']) {
  if (role !== 'owner')
    throw new HttpError(403, 'Somente o administrador pode arquivar produtos.');
}

import { api } from '../api';
import type { Place } from '../../../shared/field';

export type LookupResult = {
  found: Place | null;
  /** 'found': rua achada; 'nostreet': mapa respondeu sem rua; 'error': falhou. */
  status: 'found' | 'nostreet' | 'error';
};
/** Endereço provável das coordenadas. */
export async function reverseLookup(coords: {
  latitude: number;
  longitude: number;
}): Promise<LookupResult> {
  try {
    const found = await api<Place | null>('field/reverse', 'POST', coords);
    return found?.street
      ? { found, status: 'found' }
      : { found: null, status: 'nostreet' };
  } catch {
    return { found: null, status: 'error' };
  }
}
/**
 * Junta coordenadas e endereço achado: preenche rua, número, bairro e cidade;
 * complemento e referência ficam como estavam.
 */
export function mergeLocated(
  value: Place,
  coords: { latitude: number; longitude: number },
  found: Place | null,
): Place {
  const located = { ...value, ...coords };
  return found
    ? {
        ...located,
        street: found.street,
        number: found.number || '',
        no_number: false,
        neighborhood: found.neighborhood || located.neighborhood,
        city: found.city || located.city,
        postcode: found.postcode || located.postcode,
      }
    : located;
}
export const locatedNotice = (status: LookupResult['status']) =>
  status === 'found'
    ? 'Endereço preenchido pelo mapa. Confira a rua e o número antes de salvar.'
    : status === 'nostreet'
      ? 'Localização guardada. O mapa não tem o nome desta rua: preencha o endereço.'
      : 'Localização guardada. O serviço de mapa não respondeu agora: preencha o endereço ou tente de novo em instantes.';

export const missingNumberNotice =
  'O mapa não tem o número deste local. Digite o número ou marque S/N.';

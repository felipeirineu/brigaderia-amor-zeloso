import { api } from '../api';
import type { Place } from '../../../shared/field';

/** Endereço provável das coordenadas (null se o mapa não achar ou falhar). */
export async function reverseLookup(coords: {
  latitude: number;
  longitude: number;
}): Promise<Place | null> {
  try {
    const found = await api<Place | null>('field/reverse', 'POST', coords);
    return found?.street ? found : null;
  } catch {
    return null;
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
      }
    : located;
}
export const locatedNotice = (filled: boolean) =>
  filled
    ? 'Endereço preenchido pelo mapa. Confira a rua e o número antes de salvar.'
    : 'Localização guardada. O mapa não achou a rua: preencha o endereço.';

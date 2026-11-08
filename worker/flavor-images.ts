import tradicional from '../docs/marca/sabores/tradicional.webp';
import colorido from '../docs/marca/sabores/colorido.webp';
import amendoim from '../docs/marca/sabores/amendoim.webp';
import prestigio from '../docs/marca/sabores/prestigio.webp';
import beijinho from '../docs/marca/sabores/beijinho.webp';
import cajuzinho from '../docs/marca/sabores/cajuzinho.webp';
import uva from '../docs/marca/sabores/uva.webp';
import limao from '../docs/marca/sabores/limao.webp';
import caipirinha from '../docs/marca/sabores/caipirinha.webp';
import type { FlavorPhoto } from '../shared/flavors';
export const flavorImages: Record<FlavorPhoto, Uint8Array> = {
  tradicional,
  colorido,
  amendoim,
  prestigio,
  beijinho,
  cajuzinho,
  uva,
  limao,
  caipirinha,
  // Sabores renomeados: a chave antiga serve a foto nova.
  coco: beijinho,
  casadinho: prestigio,
};

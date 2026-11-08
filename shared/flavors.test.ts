import { describe, expect, it } from 'vitest';
import { flavorPhotos, suggestPhoto } from './flavors';
describe('suggestPhoto', () => {
  it('reconhece os nomes do catálogo', () => {
    expect(suggestPhoto('Brigadeiro')).toBe('tradicional');
    expect(suggestPhoto('Tradicional')).toBe('tradicional');
    expect(suggestPhoto('Brigadeiro Colorido')).toBe('colorido');
    expect(suggestPhoto('Brigadeiro com Amendoim')).toBe('amendoim');
    expect(suggestPhoto(' Prestígio ')).toBe('prestigio');
    expect(suggestPhoto('Beijinho')).toBe('beijinho');
    expect(suggestPhoto('Cajuzinho')).toBe('cajuzinho');
    expect(suggestPhoto('Surpresa de  Uva')).toBe('uva');
    expect(suggestPhoto('Limão')).toBe('limao');
    expect(suggestPhoto('Caipirinha')).toBe('caipirinha');
  });
  it('mantém as fotos antigas e não inventa correspondência', () => {
    expect(suggestPhoto('Côco')).toBe('coco');
    expect(suggestPhoto('Casadinho')).toBe('casadinho');
    expect(suggestPhoto('Morango')).toBeNull();
    expect(flavorPhotos).toHaveLength(11);
  });
});

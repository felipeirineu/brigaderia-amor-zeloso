import { describe, expect, it } from 'vitest';
import {
  catalogPhotos,
  flavorPhotos,
  photoChoices,
  suggestPhoto,
} from './flavors';
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
  it('trata os nomes antigos como renomeados e não inventa correspondência', () => {
    expect(suggestPhoto('Coco')).toBe('beijinho');
    expect(suggestPhoto('Côco')).toBe('beijinho');
    expect(suggestPhoto('Casadinho')).toBe('prestigio');
    expect(catalogPhotos).toHaveLength(9);
    expect(photoChoices('coco')).toContain('coco');
    expect(photoChoices('tradicional')).not.toContain('coco');
    expect(suggestPhoto('Morango')).toBeNull();
    expect(flavorPhotos).toHaveLength(11);
  });
});

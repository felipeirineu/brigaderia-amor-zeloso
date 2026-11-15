import { describe, expect, it } from 'vitest';
import {
  composeAddress,
  deliveryAddress,
  emptyPlace,
  normalizePostcode,
  withAddress,
} from './field';

describe('endereço em campos', () => {
  const base = {
    ...emptyPlace(),
    street: 'Rua DEMONSTRAÇÃO',
    number: '12',
    complement: 'Apto 3',
    neighborhood: 'Bairro DEMONSTRAÇÃO',
    city: 'Cidade DEMONSTRAÇÃO',
  };
  it('monta a linha única na ordem rua, número, complemento, bairro, cidade', () => {
    expect(composeAddress(base)).toBe(
      'Rua DEMONSTRAÇÃO, 12, Apto 3, Bairro DEMONSTRAÇÃO, Cidade DEMONSTRAÇÃO',
    );
  });
  it('S/N substitui o número e campos vazios somem', () => {
    expect(
      composeAddress({ ...base, no_number: true, complement: ' ', city: '' }),
    ).toBe('Rua DEMONSTRAÇÃO, S/N, Bairro DEMONSTRAÇÃO');
  });
  it('cadastro antigo (sem rua) mantém o texto livre', () => {
    const legacy = { ...emptyPlace(), address: 'Texto antigo DEMONSTRAÇÃO' };
    expect(withAddress(legacy).address).toBe('Texto antigo DEMONSTRAÇÃO');
    expect(withAddress({ ...legacy, street: 'Rua X' }).address).toBe('Rua X');
  });
  it('referência entra só no endereço de entrega', () => {
    const p = withAddress({ ...base, reference: 'Perto da praça' });
    expect(p.address).not.toContain('praça');
    expect(deliveryAddress(p)).toBe(p.address + ' · Ref.: Perto da praça');
    expect(deliveryAddress({ reference: 'Só referência' })).toBe('');
  });
});

describe('CEP', () => {
  it('normaliza 8 dígitos e recusa o resto', () => {
    expect(normalizePostcode('00000111')).toBe('00000-111');
    expect(normalizePostcode('00000-111')).toBe('00000-111');
    expect(normalizePostcode('123')).toBe('');
    expect(normalizePostcode(undefined)).toBe('');
  });
});

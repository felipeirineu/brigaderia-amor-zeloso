import { describe, it, expect } from 'vitest';
import {
  emptyPlace,
  distance,
  instagramProfile,
  transportLinks,
  allocateCost,
} from './field';
describe('R4 destinos e rateio', () => {
  it('normaliza apenas perfis sem caminhos ou hosts terceiros', () => {
    expect(instagramProfile('@perfil.demonstracao')).toBe(
      'perfil.demonstracao',
    );
    expect(
      instagramProfile('https://www.instagram.com/perfil_demonstracao/'),
    ).toBe('perfil_demonstracao');
    expect(() => instagramProfile('https://example.test/p')).toThrow();
    expect(() => instagramProfile('https://instagram.com/p/foto')).toThrow();
  });
  it('mede haversine, trata ausência e antimeridiano', () => {
    const p = { latitude: 0, longitude: 0 };
    expect(distance(p, p)).toBe(0);
    expect(distance(emptyPlace(), p)).toBeNull();
    expect(distance(p, { latitude: 0, longitude: 1 })).toBeCloseTo(111.195, 2);
    expect(
      distance(
        { latitude: 0, longitude: 179 },
        { latitude: 0, longitude: -179 },
      ),
    ).toBeCloseTo(222.39, 2);
  });
  it('gera links codificados apenas para abertura humana', () => {
    const links = transportLinks({
      ...emptyPlace(),
      name: 'DEMONSTRAÇÃO & destino',
      address: 'Endereço DEMONSTRAÇÃO / teste',
      latitude: 0,
      longitude: 0,
    });
    const u = new URL(links.uber);
    expect(u.searchParams.get('dropoff[nickname]')).toBe(
      'DEMONSTRAÇÃO & destino',
    );
    expect(u.searchParams.get('dropoff[latitude]')).toBe('0');
    expect(u.searchParams.get('pickup')).toBe('my_location');
    expect(new URL(links.maps).searchParams.get('destination')).toBe('0,0');
  });
  it('preserva centavos e rateia mesmo pedidos gratuitos', () => {
    expect(
      allocateCost(100, [
        { id: 'a', total_cents: 100 },
        { id: 'b', total_cents: 200 },
      ]),
    ).toEqual([
      { id: 'a', cents: 33 },
      { id: 'b', cents: 67 },
    ]);
    expect(
      allocateCost(1, [
        { id: 'a', total_cents: 0 },
        { id: 'b', total_cents: 0 },
      ]).reduce((n, x) => n + x.cents, 0),
    ).toBe(1);
  });
});

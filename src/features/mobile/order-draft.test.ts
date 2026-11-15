// Todos os IDs/valores são fixtures DEMONSTRAÇÃO, sem dados pessoais.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearDraft,
  draftKey,
  parseDraft,
  readDraft,
  storeDraft,
} from './order-draft';
const id = (n: number) =>
  '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const draft = () => ({
  customer_id: id(1),
  order_id: null,
  items: [{ variant_id: id(2), quantity: 2 }],
  kit_items: [
    {
      kit_id: id(3),
      quantity: 1,
      components: [{ product_id: id(4), units: 12 }],
    },
  ],
});
afterEach(() => vi.unstubAllGlobals());
describe('R17 seleção privada mínima por aba', () => {
  it('aceita só IDs/quantidades de itens, mistos e kits', () => {
    expect(parseDraft(JSON.stringify(draft()))).toEqual(draft());
  });
  it.each([
    'name',
    'address',
    'price_cents',
    'cost_cents',
    'dupAckKey',
    'due_at',
    'token',
  ])('rejeita o campo extra %s em vez de restaurar metadados', (key) => {
    expect(
      parseDraft(JSON.stringify({ ...draft(), [key]: 'DEMONSTRAÇÃO' })),
    ).toBeNull();
    const d = draft();
    Object.assign(d.items[0], { [key]: 'DEMONSTRAÇÃO' });
    expect(parseDraft(JSON.stringify(d))).toBeNull();
  });
  it('rejeita storage corrompido/excessivo e IDs/quantidades inválidos', () => {
    expect(parseDraft('{')).toBeNull();
    expect(parseDraft(' '.repeat(32769))).toBeNull();
    expect(
      parseDraft(JSON.stringify({ ...draft(), customer_id: 'nome' })),
    ).toBeNull();
    const d = draft();
    d.items[0].quantity = 1.5;
    expect(parseDraft(JSON.stringify(d))).toBeNull();
  });
  it('isola escopos e descarta sem deixar conteúdo', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
      removeItem: (k: string) => data.delete(k),
    });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    storeDraft(id(8) + ':' + id(9), draft());
    expect(readDraft(id(8) + ':' + id(9))).toEqual(draft());
    expect(readDraft(id(8) + ':' + id(7))).toBeNull();
    expect(readDraft(id(6) + ':' + id(9))).toBeNull();
    clearDraft(id(8) + ':' + id(9));
    expect(data.has(draftKey(id(8) + ':' + id(9)))).toBe(false);
  });
  it('storage bloqueado não impede o pedido', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw Error('bloqueado');
      },
      setItem: () => {
        throw Error('bloqueado');
      },
      removeItem: () => {
        throw Error('bloqueado');
      },
    });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    expect(readDraft('scope')).toBeNull();
    expect(() => storeDraft('scope', draft())).not.toThrow();
    expect(() => clearDraft('scope')).not.toThrow();
  });
});

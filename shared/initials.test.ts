// Nomes de exibição fictícios DEMONSTRAÇÃO, sem cadastros reais.
import { describe, expect, it } from 'vitest';
import { nameInitials } from './initials';
describe('iniciais de avatares', () => {
  it.each(['de', 'da', 'do', 'das', 'dos', 'e'])(
    'ignora %s entre palavras significativas',
    (word) => {
      expect(nameInitials(`Loja ${word} Exemplo DEMONSTRAÇÃO`)).toBe('LE');
    },
  );
  it('ignora conectivos mesmo em maiúsculas, inclusive consecutivos', () => {
    expect(nameInitials('DE da DO das DOS E exemplo teste DEMONSTRAÇÃO')).toBe(
      'ET',
    );
  });
  it('usa maiúsculas e somente as duas primeiras palavras significativas', () => {
    expect(nameInitials('  equipe  do\tTESTE  DEMONSTRAÇÃO ')).toBe('ET');
    expect(nameInitials('demonstração e teste')).toBe('DT');
    expect(nameInitials('café do exemplo DEMONSTRAÇÃO')).toBe('CE');
  });
  it('preserva acentos e normaliza marcas combinantes', () => {
    expect(nameInitials('área de exemplo DEMONSTRAÇÃO')).toBe('ÁE');
    expect(nameInitials('a\u0301rea de exemplo DEMONSTRAÇÃO')).toBe('ÁE');
  });
  it('lida com palavra única, vazio ou somente conectivos', () => {
    expect(nameInitials('DEMONSTRAÇÃO')).toBe('D');
    expect(nameInitials('   ')).toBe('');
    expect(nameInitials('de e dos')).toBe('');
  });
});

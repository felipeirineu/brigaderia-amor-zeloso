import { describe, expect, it } from 'vitest';
import { developerEmails } from './developers';

describe('developerEmails', () => {
  it('normaliza, remove duplicados e ignora valores inválidos', () => {
    expect(
      developerEmails({
        DEVELOPER_EMAILS:
          ' Dev@Exemplo.test, dev@exemplo.test;outro@exemplo.test  lixo ',
      }),
    ).toEqual(['dev@exemplo.test', 'outro@exemplo.test']);
  });
  it('sem segredo, ninguém é desenvolvedor', () => {
    expect(developerEmails({})).toEqual([]);
  });
});

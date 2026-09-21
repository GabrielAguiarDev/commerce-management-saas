import { ModuleAccessError, isAccessDenied, throwIfAccessDenied } from '../accessDenied';

describe('isAccessDenied', () => {
  it('reconhece a recusa do RLS e das funções do banco (42501)', () => {
    expect(isAccessDenied({ code: '42501', message: 'new row violates row-level security policy' })).toBe(true);
  });

  it('reconhece a recusa por módulo das funções do banco', () => {
    expect(isAccessDenied({ code: '42501', message: 'sem permissão para o caixa' })).toBe(true);
    expect(isAccessDenied({ code: '42501', message: 'sem permissão para vendas' })).toBe(true);
  });

  it('NÃO trata regra de negócio com 42501 como perda de módulo', () => {
    expect(
      isAccessDenied({
        code: '42501',
        message: 'custo que repete todo mês só pode ser editado pelo portal ou app',
      }),
    ).toBe(false);
    expect(
      isAccessDenied({
        code: '42501',
        message: 'este custo veio de uma entrada de estoque; ajuste pelo estoque',
      }),
    ).toBe(false);
    expect(isAccessDenied({ code: '42501', message: 'caixa de outro negócio' })).toBe(false);
  });

  it('não confunde com outros erros do Postgres nem com falha de rede', () => {
    expect(isAccessDenied({ code: '23505' })).toBe(false);
    expect(isAccessDenied(new Error('Network request failed'))).toBe(false);
    expect(isAccessDenied(null)).toBe(false);
  });
});

describe('throwIfAccessDenied', () => {
  it('converte a recusa em ModuleAccessError com a mensagem do banco', () => {
    expect(() => throwIfAccessDenied({ code: '42501', message: 'sem permissão para o caixa' })).toThrow(
      new ModuleAccessError('sem permissão para o caixa'),
    );
  });

  it('repassa um ModuleAccessError que já veio traduzido', () => {
    const e = new ModuleAccessError();
    expect(() => throwIfAccessDenied(e)).toThrow(e);
  });

  it('deixa passar o resto, para o domínio traduzir', () => {
    expect(() => throwIfAccessDenied({ code: '23505' })).not.toThrow();
  });
});

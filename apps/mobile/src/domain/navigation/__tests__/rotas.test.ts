import { derivarCapacidades } from '@domain/tenant/tenantAdapter';
import type { Capacidades } from '@domain/tenant/tenantTypes';

import {
  ROTAS,
  atalhoDaTabBar,
  itensDaTabBar,
  itensDoMais,
  resolverRotaDeEntrada,
  rotaPermitida,
} from '../rotas';

const COMPLETO = derivarCapacidades([
  'sales',
  'products',
  'cash',
  'stock',
  'costs',
  'reports',
  'support',
  'app',
]);
const ESSENCIAL = derivarCapacidades(['sales', 'products', 'costs', 'support', 'app']);

describe('resolverRotaDeEntrada', () => {
  it('segura a splash enquanto os stores não hidrataram', () => {
    expect(
      resolverRotaDeEntrada({ hidratado: false, autenticado: true, temAcessoAoApp: true }),
    ).toBeNull();
  });

  it('manda para o login sem sessão', () => {
    expect(
      resolverRotaDeEntrada({ hidratado: true, autenticado: false, temAcessoAoApp: null }),
    ).toBe(ROTAS.login);
  });

  it('segura a splash enquanto o plano do tenant ainda não chegou', () => {
    expect(
      resolverRotaDeEntrada({ hidratado: true, autenticado: true, temAcessoAoApp: null }),
    ).toBeNull();
  });

  it('manda para o bloqueio quando o plano não inclui o app', () => {
    expect(
      resolverRotaDeEntrada({ hidratado: true, autenticado: true, temAcessoAoApp: false }),
    ).toBe(ROTAS.bloqueio);
  });

  it('manda para o início quando tudo está no lugar', () => {
    expect(
      resolverRotaDeEntrada({ hidratado: true, autenticado: true, temAcessoAoApp: true }),
    ).toBe(ROTAS.inicio);
  });

  it('é idempotente: mesma entrada, mesma saída, sem efeito colateral', () => {
    const entrada = { hidratado: true, autenticado: true, temAcessoAoApp: true } as const;
    expect(resolverRotaDeEntrada(entrada)).toBe(resolverRotaDeEntrada(entrada));
  });

  it('não autenticado tem precedência sobre plano sem app', () => {
    expect(
      resolverRotaDeEntrada({ hidratado: true, autenticado: false, temAcessoAoApp: false }),
    ).toBe(ROTAS.login);
  });
});

describe('atalhoDaTabBar', () => {
  it('vira Caixa quando o plano tem caixa', () => {
    expect(atalhoDaTabBar(COMPLETO)).toMatchObject({ rotulo: 'Caixa', rota: ROTAS.caixa });
  });

  it('vira Custos quando não tem', () => {
    expect(atalhoDaTabBar(ESSENCIAL)).toMatchObject({ rotulo: 'Custos', rota: ROTAS.custos });
  });

  it('a tab bar tem sempre 4 itens, em qualquer plano', () => {
    expect(itensDaTabBar(COMPLETO)).toHaveLength(4);
    expect(itensDaTabBar(ESSENCIAL)).toHaveLength(4);
  });
});

describe('itensDoMais', () => {
  it('mostra os seis módulos no Plano Completo', () => {
    expect(itensDoMais(COMPLETO).map((i) => i.chave)).toEqual([
      'caixa',
      'estoque',
      'custos',
      'relatorios',
      'config',
      'suporte',
    ]);
  });

  it('esconde caixa, estoque e relatórios no Plano Essencial', () => {
    expect(itensDoMais(ESSENCIAL).map((i) => i.chave)).toEqual(['custos', 'config', 'suporte']);
  });

  it('Configurações e Suporte aparecem mesmo no plano mais magro', () => {
    const nenhum: Capacidades = derivarCapacidades([]);
    expect(itensDoMais(nenhum).map((i) => i.chave)).toEqual(['config', 'suporte']);
  });

  it('mostra badge só quando há chamado não lido', () => {
    expect(itensDoMais(COMPLETO, 0).find((i) => i.chave === 'suporte')?.badge).toBe('');
    expect(itensDoMais(COMPLETO, 2).find((i) => i.chave === 'suporte')?.badge).toBe('2');
  });
});

describe('rotaPermitida', () => {
  it('barra a rota de um módulo que o plano não inclui (deep link)', () => {
    expect(rotaPermitida(ROTAS.estoque, ESSENCIAL)).toBe(false);
    expect(rotaPermitida(ROTAS.caixa, ESSENCIAL)).toBe(false);
    expect(rotaPermitida(ROTAS.relatorios, ESSENCIAL)).toBe(false);
  });

  it('libera o que o plano inclui', () => {
    expect(rotaPermitida(ROTAS.custos, ESSENCIAL)).toBe(true);
    expect(rotaPermitida(ROTAS.estoque, COMPLETO)).toBe(true);
  });

  it('rotas base passam sempre', () => {
    expect(rotaPermitida(ROTAS.inicio, ESSENCIAL)).toBe(true);
    expect(rotaPermitida(ROTAS.config, ESSENCIAL)).toBe(true);
    expect(rotaPermitida(ROTAS.vender, ESSENCIAL)).toBe(true);
  });
});

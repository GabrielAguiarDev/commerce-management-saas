import { deriveCapabilities } from '@domain/tenant/tenantAdapter';
import type { Capabilities } from '@domain/tenant/tenantTypes';

import {
  ROUTES,
  atalhoDaTabBar,
  tabBarItems,
  moreItems,
  resolverRotaDeEntrada,
  isRouteAllowed,
} from '../routes';

const COMPLETO = deriveCapabilities([
  'sales',
  'products',
  'cash',
  'stock',
  'costs',
  'reports',
  'support',
  'app',
]);
const ESSENTIAL = deriveCapabilities(['sales', 'products', 'costs', 'support', 'app']);

describe('resolverRotaDeEntrada', () => {
  it('segura a splash enquanto os stores não hidrataram', () => {
    expect(
      resolverRotaDeEntrada({ hydrated: false, autenticado: true, hasAppAccess: true }),
    ).toBeNull();
  });

  it('manda para o login sem sessão', () => {
    expect(
      resolverRotaDeEntrada({ hydrated: true, autenticado: false, hasAppAccess: null }),
    ).toBe(ROUTES.login);
  });

  it('segura a splash enquanto o plano do tenant ainda não chegou', () => {
    expect(
      resolverRotaDeEntrada({ hydrated: true, autenticado: true, hasAppAccess: null }),
    ).toBeNull();
  });

  it('manda para o bloqueio quando o plano não inclui o app', () => {
    expect(
      resolverRotaDeEntrada({ hydrated: true, autenticado: true, hasAppAccess: false }),
    ).toBe(ROUTES.bloqueio);
  });

  it('manda para o início quando tudo está no lugar', () => {
    expect(
      resolverRotaDeEntrada({ hydrated: true, autenticado: true, hasAppAccess: true }),
    ).toBe(ROUTES.inicio);
  });

  it('é idempotente: mesma entrada, mesma saída, sem efeito colateral', () => {
    const entrada = { hydrated: true, autenticado: true, hasAppAccess: true } as const;
    expect(resolverRotaDeEntrada(entrada)).toBe(resolverRotaDeEntrada(entrada));
  });

  it('não autenticado tem precedência sobre plano sem app', () => {
    expect(
      resolverRotaDeEntrada({ hydrated: true, autenticado: false, hasAppAccess: false }),
    ).toBe(ROUTES.login);
  });
});

describe('atalhoDaTabBar', () => {
  it('vira Caixa quando o plano tem caixa', () => {
    expect(atalhoDaTabBar(COMPLETO)).toMatchObject({ label: 'Caixa', route: ROUTES.cash });
  });

  it('vira Custos quando não tem', () => {
    expect(atalhoDaTabBar(ESSENTIAL)).toMatchObject({ label: 'Custos', route: ROUTES.costs });
  });

  it('a tab bar tem sempre 4 itens, em qualquer plano', () => {
    expect(tabBarItems(COMPLETO)).toHaveLength(4);
    expect(tabBarItems(ESSENTIAL)).toHaveLength(4);
  });
});

describe('itensDoMais', () => {
  it('mostra os seis módulos no Plano Completo', () => {
    expect(moreItems(COMPLETO).map((i) => i.key)).toEqual([
      'cash',
      'stock',
      'costs',
      'reports',
      'settings',
      'support',
    ]);
  });

  it('esconde caixa, estoque e relatórios no Plano Essencial', () => {
    expect(moreItems(ESSENTIAL).map((i) => i.key)).toEqual(['costs', 'settings', 'support']);
  });

  it('Configurações e Suporte aparecem mesmo no plano mais magro', () => {
    const nenhum: Capabilities = deriveCapabilities([]);
    expect(moreItems(nenhum).map((i) => i.key)).toEqual(['settings', 'support']);
  });

  it('mostra badge só quando há chamado não lido', () => {
    expect(moreItems(COMPLETO, 0).find((i) => i.key === 'support')?.badge).toBe('');
    expect(moreItems(COMPLETO, 2).find((i) => i.key === 'support')?.badge).toBe('2');
  });
});

describe('rotaPermitida', () => {
  it('barra a rota de um módulo que o plano não inclui (deep link)', () => {
    expect(isRouteAllowed(ROUTES.stock, ESSENTIAL)).toBe(false);
    expect(isRouteAllowed(ROUTES.cash, ESSENTIAL)).toBe(false);
    expect(isRouteAllowed(ROUTES.reports, ESSENTIAL)).toBe(false);
  });

  it('libera o que o plano inclui', () => {
    expect(isRouteAllowed(ROUTES.costs, ESSENTIAL)).toBe(true);
    expect(isRouteAllowed(ROUTES.stock, COMPLETO)).toBe(true);
  });

  it('rotas base passam sempre', () => {
    expect(isRouteAllowed(ROUTES.inicio, ESSENTIAL)).toBe(true);
    expect(isRouteAllowed(ROUTES.config, ESSENTIAL)).toBe(true);
    expect(isRouteAllowed(ROUTES.vender, ESSENTIAL)).toBe(true);
  });
});

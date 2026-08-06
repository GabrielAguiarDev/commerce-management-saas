/// <reference types="node" />

import fs from 'node:fs';
import path from 'node:path';

import { deriveCapabilities } from '@domain/tenant/tenantAdapter';
import type { Capabilities } from '@domain/tenant/tenantTypes';

import {
  ROUTES,
  tabBarShortcut,
  tabBarItems,
  moreItems,
  resolveEntryRoute,
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
      resolveEntryRoute({ hydrated: false, isAuthenticated: true, hasAppAccess: true }),
    ).toBeNull();
  });

  it('manda para o login sem sessão', () => {
    expect(
      resolveEntryRoute({ hydrated: true, isAuthenticated: false, hasAppAccess: null }),
    ).toBe(ROUTES.login);
  });

  it('segura a splash enquanto o plano do tenant ainda não chegou', () => {
    expect(
      resolveEntryRoute({ hydrated: true, isAuthenticated: true, hasAppAccess: null }),
    ).toBeNull();
  });

  it('manda para o bloqueio quando o plano não inclui o app', () => {
    expect(
      resolveEntryRoute({ hydrated: true, isAuthenticated: true, hasAppAccess: false }),
    ).toBe(ROUTES.blocked);
  });

  it('manda para o início quando tudo está no lugar', () => {
    expect(
      resolveEntryRoute({ hydrated: true, isAuthenticated: true, hasAppAccess: true }),
    ).toBe(ROUTES.home);
  });

  it('é idempotente: mesma entrada, mesma saída, sem efeito colateral', () => {
    const entrada = { hydrated: true, isAuthenticated: true, hasAppAccess: true } as const;
    expect(resolveEntryRoute(entrada)).toBe(resolveEntryRoute(entrada));
  });

  it('não autenticado tem precedência sobre plano sem app', () => {
    expect(
      resolveEntryRoute({ hydrated: true, isAuthenticated: false, hasAppAccess: false }),
    ).toBe(ROUTES.login);
  });
});

describe('atalhoDaTabBar', () => {
  it('vira Caixa quando o plano tem caixa', () => {
    expect(tabBarShortcut(COMPLETO)).toMatchObject({ label: 'Caixa', route: ROUTES.cash });
  });

  it('vira Custos quando não tem', () => {
    expect(tabBarShortcut(ESSENTIAL)).toMatchObject({ label: 'Custos', route: ROUTES.costs });
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
    expect(isRouteAllowed(ROUTES.home, ESSENTIAL)).toBe(true);
    expect(isRouteAllowed(ROUTES.settings, ESSENTIAL)).toBe(true);
    expect(isRouteAllowed(ROUTES.sell, ESSENTIAL)).toBe(true);
  });
});

/**
 * O teste que faltava.
 *
 * As suítes acima comparam `ROUTES` consigo mesmo, então continuavam verdes
 * mesmo quando TODO valor apontava para uma rota inexistente — foi exatamente
 * o que aconteceu ao renomear os arquivos de rota para o inglês sem atualizar
 * as constantes: o app abria direto no `+not-found` e o botão "Ir para o
 * início" caía nele de novo. `tsc` não pega isso (são strings válidas) e o
 * expo-router não reclama (rota desconhecida é 404, não erro).
 *
 * Aqui o alvo é o SISTEMA DE ARQUIVOS: cada valor de `ROUTES` precisa ser
 * respondido por um arquivo real em `app/`.
 */
describe('ROUTES x arquivos de rota', () => {
  const appDir = path.resolve(__dirname, '../../../../app');

  /** Segmento de grupo — `(app)` — não aparece na URL. */
  const isGroup = (segment: string) => segment.startsWith('(') && segment.endsWith(')');

  function collect(dir: string, prefix: string[] = []): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry: fs.Dirent) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collect(full, isGroup(entry.name) ? prefix : [...prefix, entry.name]);
      }
      if (!entry.name.endsWith('.tsx')) return [];

      const base = entry.name.replace(/\.tsx$/, '');
      // `_layout` não é rota; `+not-found` é o catch-all.
      if (base.startsWith('_') || base.startsWith('+')) return [];

      const segments = base === 'index' ? prefix : [...prefix, base];
      return [`/${segments.join('/')}`.replace(/\/$/, '') || '/'];
    });
  }

  const existing = new Set(collect(appDir));

  it.each(Object.entries(ROUTES))('%s (%s) tem um arquivo de rota', (_key, route) => {
    expect(existing).toContain(route);
  });
});

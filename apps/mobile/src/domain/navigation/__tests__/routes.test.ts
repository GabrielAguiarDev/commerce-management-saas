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
  resolveAppGate,
  resolveEntryRoute,
  isRouteAllowed,
  isTabRoute,
} from '../routes';
import type { AppGateState } from '../routes';

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
    expect(resolveEntryRoute({ hydrated: false, isAuthenticated: true })).toBeNull();
  });

  it('manda para o login sem sessão', () => {
    expect(resolveEntryRoute({ hydrated: true, isAuthenticated: false })).toBe(ROUTES.login);
  });

  it('manda para o início com sessão — o entitlement é do guardião, não daqui', () => {
    expect(resolveEntryRoute({ hydrated: true, isAuthenticated: true })).toBe(ROUTES.home);
  });

  it('é idempotente: mesma entrada, mesma saída, sem efeito colateral', () => {
    const entrada = { hydrated: true, isAuthenticated: true } as const;
    expect(resolveEntryRoute(entrada)).toBe(resolveEntryRoute(entrada));
  });
});

describe('resolveAppGate', () => {
  /** Tudo no lugar; cada teste muda só o que precisa provar. */
  const OK: AppGateState = {
    hydrated: true,
    isAuthenticated: true,
    hasAppAccess: true,
    accessFailed: false,
    capabilitiesSettled: true,
    released: false,
  };

  it('segura enquanto os stores não hidrataram', () => {
    expect(resolveAppGate({ ...OK, hydrated: false })).toBe('hold');
  });

  it('manda para o login sem sessão', () => {
    expect(resolveAppGate({ ...OK, isAuthenticated: false })).toBe('login');
  });

  it('segura enquanto não sabe se o plano inclui o app', () => {
    expect(resolveAppGate({ ...OK, hasAppAccess: null })).toBe('hold');
  });

  it('não confunde "ainda não sei" com "o plano não inclui"', () => {
    expect(resolveAppGate({ ...OK, hasAppAccess: null })).not.toBe('blocked');
    expect(resolveAppGate({ ...OK, hasAppAccess: false })).toBe('blocked');
  });

  it('mostra erro quando a consulta do entitlement desistiu', () => {
    expect(resolveAppGate({ ...OK, accessFailed: true, hasAppAccess: null })).toBe('error');
  });

  it('segura enquanto o plano (capacidades) não chegou — a tab bar depende dele', () => {
    expect(resolveAppGate({ ...OK, capabilitiesSettled: false })).toBe('hold');
  });

  it('libera quando tudo está no lugar', () => {
    expect(resolveAppGate(OK)).toBe('allow');
  });

  /**
   * A TRAVA — o coração da correção do flash.
   *
   * Depois de liberado, nenhuma revalidação em segundo plano pode devolver o
   * portão para `hold`: `hold` esconde a navegação inteira, e era esse instante
   * que aparecia como a tab bar sumindo e voltando a cada troca de aba.
   */
  describe('a trava', () => {
    it('não volta a segurar quando o entitlement é reconsultado', () => {
      expect(resolveAppGate({ ...OK, released: true, hasAppAccess: null })).toBe('allow');
    });

    it('não volta a segurar quando o plano é reconsultado', () => {
      expect(resolveAppGate({ ...OK, released: true, capabilitiesSettled: false })).toBe('allow');
    });

    it('não mostra erro por uma falha de rede depois de já ter entrado', () => {
      expect(resolveAppGate({ ...OK, released: true, accessFailed: true })).toBe('allow');
    });

    it('MAS a sessão sumir expulsa mesmo quem já entrou', () => {
      expect(resolveAppGate({ ...OK, released: true, isAuthenticated: false })).toBe('login');
    });
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

/**
 * Empilhar sobre uma aba não funciona — navegador de abas não tem pilha —, e o
 * erro só apareceria em runtime, num plano específico, na terceira tela. Aqui
 * ele é pego no jest.
 */
describe('isTabRoute', () => {
  it('reconhece as cinco rotas que vivem no navegador de abas', () => {
    expect(isTabRoute(ROUTES.home)).toBe(true);
    expect(isTabRoute(ROUTES.products)).toBe(true);
    expect(isTabRoute(ROUTES.cash)).toBe(true);
    expect(isTabRoute(ROUTES.costs)).toBe(true);
    expect(isTabRoute(ROUTES.more)).toBe(true);
  });

  it('Vender é raiz mas NÃO é aba: empilha sobre elas', () => {
    expect(isTabRoute(ROUTES.sell)).toBe(false);
  });

  it('as telas empilhadas não são abas', () => {
    expect(isTabRoute(ROUTES.stock)).toBe(false);
    expect(isTabRoute(ROUTES.reports)).toBe(false);
    expect(isTabRoute(ROUTES.settings)).toBe(false);
    expect(isTabRoute(ROUTES.support)).toBe(false);
  });

  it('todo destino do 3º item da tab bar é uma aba, em qualquer plano', () => {
    expect(isTabRoute(tabBarShortcut(COMPLETO).route)).toBe(true);
    expect(isTabRoute(tabBarShortcut(ESSENTIAL).route)).toBe(true);
  });

  it('todo item da tab bar é uma aba, em qualquer plano', () => {
    for (const item of [...tabBarItems(COMPLETO), ...tabBarItems(ESSENTIAL)]) {
      expect(isTabRoute(item.route)).toBe(true);
    }
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

  it('a fila de vendas offline passa em QUALQUER plano', () => {
    // Ela não é um módulo vendido à parte: é o caminho de volta das vendas que
    // o aparelho guardou. Trancá-la por plano deixaria dinheiro real preso no
    // celular de quem paga o plano mais barato.
    expect(isRouteAllowed(ROUTES.pendingSales, ESSENTIAL)).toBe(true);
    expect(isRouteAllowed(ROUTES.pendingSales, COMPLETO)).toBe(true);
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

  /** A rota e os grupos que a envolvem — `(app)`, `(tabs)`. */
  interface RouteFile {
    route: string;
    groups: string[];
  }

  function collect(dir: string, prefix: string[] = [], groups: string[] = []): RouteFile[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry: fs.Dirent) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return isGroup(entry.name)
          ? collect(full, prefix, [...groups, entry.name])
          : collect(full, [...prefix, entry.name], groups);
      }
      if (!entry.name.endsWith('.tsx')) return [];

      const base = entry.name.replace(/\.tsx$/, '');
      // `_layout` não é rota; `+not-found` é o catch-all.
      if (base.startsWith('_') || base.startsWith('+')) return [];

      const segments = base === 'index' ? prefix : [...prefix, base];
      return [{ route: `/${segments.join('/')}`.replace(/\/$/, '') || '/', groups }];
    });
  }

  const files = collect(appDir);
  const existing = new Set(files.map((f) => f.route));
  const inTabsGroup = new Set(
    files.filter((f) => f.groups.includes('(tabs)')).map((f) => f.route),
  );

  it.each(Object.entries(ROUTES))('%s (%s) tem um arquivo de rota', (_key, route) => {
    expect(existing).toContain(route);
  });

  /**
   * A outra metade do mesmo problema.
   *
   * `isTabRoute` diz como se navega até uma rota; a pasta diz onde ela mora. Se
   * as duas discordarem, o app faz `push` numa aba (não funciona) ou `jumpTo`
   * numa tela empilhada (não existe) — e nada disso é erro de compilação.
   */
  it.each(Object.values(ROUTES))(
    '%s: estar em (tabs) e ser aba são a mesma coisa',
    (route) => {
      expect(isTabRoute(route)).toBe(inTabsGroup.has(route));
    },
  );
});

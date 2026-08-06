import type { Capabilities } from '@domain/tenant/tenantTypes';

import type { TabBarItem, MoreItem } from './navigationTypes';

/**
 * DECISÕES DE NAVEGAÇÃO COMO FUNÇÃO PURA.
 *
 * Três lugares precisam da mesma resposta ("para onde vai o 3º item da tab
 * bar?", "que módulos aparecem na grade?", "esta rota é permitida?"). Se cada
 * um respondesse por conta própria, uma mudança de plano deixaria a tab bar e
 * a grade discordando — e rota fixa espalhada por tela é como nasce laço de
 * navegação. A resposta mora aqui, num arquivo sem React e testado no node.
 */

/**
 * The path of every route, in ONE place.
 *
 * These strings must match the file names under `app/` exactly — expo-router
 * is file-based, so a value here that no route file answers to silently falls
 * through to `+not-found`. That is not hypothetical: renaming the route files
 * to English while these values still said `/inicio` sent the entry redirect,
 * and the 404 screen's own "go home" button, straight back to `+not-found`.
 */
export const ROUTES = {
  entry: '/',
  login: '/login',
  blocked: '/blocked',
  home: '/home',
  sell: '/sell',
  products: '/products',
  more: '/more',
  cash: '/cash',
  stock: '/stock',
  costs: '/costs',
  reports: '/reports',
  settings: '/settings',
  support: '/support',
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

export interface GateState {
  /** `false` enquanto os stores persistidos ainda não hidrataram. */
  hydrated: boolean;
  isAuthenticated: boolean;
  /** `null` enquanto o tenant do usuário ainda não carregou. */
  hasAppAccess: boolean | null;
}

/**
 * O PORTÃO: para onde ir agora.
 *
 * Idempotente e sem efeito colateral — pode ser chamada a cada render sem
 * medo. `null` significa "ainda não sei, segure a splash": é o que impede a
 * tela de login de piscar por 200ms para quem já estava logado.
 *
 * Ordem das perguntas importa:
 *  1. hidratou? senão não dá para saber se há sessão;
 *  2. tem sessão? senão é login;
 *  3. o PLANO inclui o app? o bloqueio é entitlement, não erro de senha —
 *     por isso vem depois de autenticar, e não antes.
 */
export function resolveEntryRoute(state: GateState): Route | null {
  if (!state.hydrated) return null;
  if (!state.isAuthenticated) return ROUTES.login;
  if (state.hasAppAccess === null) return null;
  if (!state.hasAppAccess) return ROUTES.blocked;
  return ROUTES.home;
}

/**
 * O 3º item da tab bar: Caixa quando o plano inclui caixa, senão Custos.
 *
 * Vem do protótipo (`irCaixaOuCustos`, linha 1173) e é a expressão mais visível
 * do entitlement: o mesmo botão, dois destinos, conforme o que foi contratado.
 */
export function tabBarShortcut(caps: Capabilities): TabBarItem {
  return caps.hasCash
    ? { key: 'cash', label: 'Caixa', route: ROUTES.cash, icon: 'cash' }
    : { key: 'costs', label: 'Custos', route: ROUTES.costs, icon: 'costs' };
}

export function tabBarItems(caps: Capabilities): TabBarItem[] {
  return [
    { key: 'home', label: 'Início', route: ROUTES.home, icon: 'home' },
    { key: 'products', label: 'Produtos', route: ROUTES.products, icon: 'products' },
    tabBarShortcut(caps),
    { key: 'more', label: 'Mais', route: ROUTES.more, icon: 'more' },
  ];
}

/**
 * A grade da tela "Mais".
 *
 * Configurações aparece sempre (são os dados do próprio negócio — vendê-la
 * separadamente deixaria o dono sem como editar o próprio nome). Suporte
 * também: é por ele que se pede a mudança de plano, então tirá-lo do plano
 * mais barato seria trancar a porta por dentro.
 */
export function moreItems(caps: Capabilities, unreadTickets = 0): MoreItem[] {
  const items: MoreItem[] = [];

  if (caps.hasCash) {
    items.push({
      key: 'cash',
      name: 'Caixa',
      description: 'Abrir, sangria e fechamento',
      route: ROUTES.cash,
      icon: 'cash',
      badge: '',
    });
  }
  if (caps.hasStock) {
    items.push({
      key: 'stock',
      name: 'Estoque',
      description: 'O que tem e o que falta',
      route: ROUTES.stock,
      icon: 'stock',
      badge: '',
    });
  }
  if (caps.hasCosts) {
    items.push({
      key: 'costs',
      name: 'Custos',
      description: 'O que sai do seu bolso',
      route: ROUTES.costs,
      icon: 'costs',
      badge: '',
    });
  }
  if (caps.hasReports) {
    items.push({
      key: 'reports',
      name: 'Relatórios',
      description: 'Entrou, saiu e sobrou',
      route: ROUTES.reports,
      icon: 'reports',
      badge: '',
    });
  }

  items.push({
    key: 'settings',
    name: 'Configurações',
    description: 'Negócio, equipe e plano',
    route: ROUTES.settings,
    icon: 'settings',
    badge: '',
  });

  items.push({
    key: 'support',
    name: 'Suporte',
    description: 'Fale com a gente',
    route: ROUTES.support,
    icon: 'support',
    badge: unreadTickets > 0 ? String(unreadTickets) : '',
  });

  return items;
}

/**
 * Guarda de rota por entitlement.
 *
 * Existe porque a rota é alcançável por deep link: `aguiarone://estoque` num
 * plano sem estoque abriria uma tela vazia e sem sentido. Aqui ela é barrada
 * antes de montar.
 */
export function isRouteAllowed(route: string, caps: Capabilities): boolean {
  switch (route) {
    case ROUTES.cash:
      return caps.hasCash;
    case ROUTES.stock:
      return caps.hasStock;
    case ROUTES.costs:
      return caps.hasCosts;
    case ROUTES.reports:
      return caps.hasReports;
    case ROUTES.support:
      return caps.hasSupport;
    default:
      return true;
  }
}

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
  /**
   * As três da recuperação de senha. Elas EMPILHAM sobre o login (têm botão
   * voltar e o gesto do iOS), e não se alcançam por deep link vindo de fora:
   * cada uma depende do que a anterior apurou — o código só faz sentido depois
   * do e-mail. Ver `app/forgot-password.tsx`.
   */
  forgotPassword: '/forgot-password',
  verifyCode: '/verify-code',
  newPassword: '/new-password',
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

/**
 * As rotas que vivem DENTRO do navegador de abas (`app/(app)/(tabs)/`).
 *
 * A lista importa porque as duas famílias de rota se alcançam de maneiras
 * diferentes: uma aba se ALCANÇA (`navigate` → jumpTo, sem desmontar nada), uma
 * tela comum se EMPILHA (`push`, com botão voltar). Empilhar sobre uma aba não
 * funciona — o navegador de abas não tem pilha —, e é o tipo de erro que só
 * aparece em runtime, num plano específico, na terceira tela.
 *
 * Note que Caixa E Custos estão aqui, embora só um dos dois seja o 3º item da
 * barra em cada plano (ver `tabBarShortcut`): os dois são destino de raiz, e o
 * que não está na barra continua alcançável pela grade do "Mais".
 *
 * `/sell` NÃO está, e é a exceção que vale explicar: ela é acionada pelo botão
 * central da barra, o que a faz PARECER uma aba, mas precisa da tela inteira
 * para a grade de produtos. Então ela empilha sobre as abas como qualquer tela
 * interna, cobrindo a tab bar.
 *
 * Esta lista também é a resposta de "tem tab bar embaixo desta tela?", que é o
 * que a barra do carrinho, o toast e o rodapé do `Screen` precisam saber para
 * não flutuarem sobre um rodapé vazio. Ver `useOnTabScreen`.
 */
const TAB_ROUTES: readonly string[] = [
  ROUTES.home,
  ROUTES.products,
  ROUTES.cash,
  ROUTES.costs,
  ROUTES.more,
];

export function isTabRoute(route: string): boolean {
  return TAB_ROUTES.includes(route);
}

export interface EntryState {
  /** `false` enquanto os stores persistidos ainda não hidrataram. */
  hydrated: boolean;
  isAuthenticated: boolean;
}

/**
 * A PORTA DA RUA: login ou app.
 *
 * Idempotente e sem efeito colateral — pode ser chamada a cada render sem
 * medo. `null` significa "ainda não sei, segure a splash": é o que impede a
 * tela de login de piscar por 200ms para quem já estava logado.
 *
 * Ela NÃO pergunta pelo entitlement. Quem decide entre entrar e a tela de
 * bloqueio é o GUARDIÃO do grupo `(app)` (`resolveAppGate` abaixo), e a razão é
 * arquitetural: `/` é uma rota de passagem — quem chega por deep link em
 * `/home` nunca passa por aqui. Verificar o plano só neste arquivo deixava a
 * porta dos fundos aberta.
 */
export function resolveEntryRoute(state: EntryState): Route | null {
  if (!state.hydrated) return null;
  return state.isAuthenticated ? ROUTES.home : ROUTES.login;
}

/**
 * O que o guardião do app deve fazer AGORA.
 *
 *   `hold`    → segurar (ainda não sei): nada é renderizado além do fundo;
 *   `login`   → não há sessão;
 *   `error`   → não deu para confirmar o plano (rede/servidor);
 *   `blocked` → o plano realmente não inclui o app;
 *   `allow`   → libera a navegação inteira.
 */
export type AppGate = 'hold' | 'login' | 'error' | 'blocked' | 'allow';

export interface AppGateState {
  hydrated: boolean;
  isAuthenticated: boolean;
  /** `null` = ainda não sei. NÃO confundir com `false` (o plano não inclui). */
  hasAppAccess: boolean | null;
  /** A consulta do entitlement desistiu depois das tentativas. */
  accessFailed: boolean;
  /** As capacidades do plano já chegaram (sucesso OU erro). */
  capabilitiesSettled: boolean;
  /**
   * O guardião JÁ LIBEROU uma vez nesta sessão.
   *
   * Esta é a trava que separa "verificar na entrada" de "verificar a cada
   * navegação". Sem ela, qualquer refetch em segundo plano (voltar do
   * background, reconectar, `onAuthStateChange`) devolveria `hold` por um
   * instante — e `hold` esconde a navegação inteira. Era exatamente esse
   * instante que aparecia como a tab bar sumindo e voltando.
   *
   * Depois de liberado, só uma coisa fecha o portão de novo: a SESSÃO sumir.
   * Por isso `login` é perguntado ANTES da trava.
   */
  released: boolean;
}

/**
 * O GUARDIÃO — chamado uma vez, acima das abas.
 *
 * Ordem das perguntas importa:
 *  1. hidratou? senão não dá para saber se há sessão;
 *  2. tem sessão? senão é login — e isto vem antes da trava, porque perder a
 *     sessão é a única coisa que pode expulsar quem já entrou;
 *  3. já liberou? então libera de novo, sem reconsultar nada;
 *  4. a consulta falhou de vez? tela de erro com "tentar de novo";
 *  5. o PLANO inclui o app? o bloqueio é entitlement, não erro de senha;
 *  6. as capacidades chegaram? sem elas a tab bar mostraria o plano mais pobre
 *     por uma fração de segundo — esperar UMA vez aqui é o que permite à barra
 *     nunca mais ter estado de carregamento.
 */
export function resolveAppGate(state: AppGateState): AppGate {
  if (!state.hydrated) return 'hold';
  if (!state.isAuthenticated) return 'login';
  if (state.released) return 'allow';
  if (state.accessFailed) return 'error';
  if (state.hasAppAccess === null) return 'hold';
  if (!state.hasAppAccess) return 'blocked';
  if (!state.capabilitiesSettled) return 'hold';
  return 'allow';
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

import type { Capacidades } from '@domain/tenant/tenantTypes';

import type { ItemDaTabBar, ItemDoMais } from './navigationTypes';

/**
 * DECISÕES DE NAVEGAÇÃO COMO FUNÇÃO PURA.
 *
 * Três lugares precisam da mesma resposta ("para onde vai o 3º item da tab
 * bar?", "que módulos aparecem na grade?", "esta rota é permitida?"). Se cada
 * um respondesse por conta própria, uma mudança de plano deixaria a tab bar e
 * a grade discordando — e rota fixa espalhada por tela é como nasce laço de
 * navegação. A resposta mora aqui, num arquivo sem React e testado no node.
 */

export const ROTAS = {
  entrada: '/',
  login: '/login',
  bloqueio: '/bloqueio',
  inicio: '/inicio',
  vender: '/vender',
  produtos: '/produtos',
  mais: '/mais',
  caixa: '/caixa',
  estoque: '/estoque',
  custos: '/custos',
  relatorios: '/relatorios',
  config: '/config',
  suporte: '/suporte',
} as const;

export type Rota = (typeof ROTAS)[keyof typeof ROTAS];

export interface EstadoDoPortao {
  /** `false` enquanto os stores persistidos ainda não hidrataram. */
  hidratado: boolean;
  autenticado: boolean;
  /** `null` enquanto o tenant do usuário ainda não carregou. */
  temAcessoAoApp: boolean | null;
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
export function resolverRotaDeEntrada(estado: EstadoDoPortao): Rota | null {
  if (!estado.hidratado) return null;
  if (!estado.autenticado) return ROTAS.login;
  if (estado.temAcessoAoApp === null) return null;
  if (!estado.temAcessoAoApp) return ROTAS.bloqueio;
  return ROTAS.inicio;
}

/**
 * O 3º item da tab bar: Caixa quando o plano inclui caixa, senão Custos.
 *
 * Vem do protótipo (`irCaixaOuCustos`, linha 1173) e é a expressão mais visível
 * do entitlement: o mesmo botão, dois destinos, conforme o que foi contratado.
 */
export function atalhoDaTabBar(caps: Capacidades): ItemDaTabBar {
  return caps.temCaixa
    ? { chave: 'caixa', rotulo: 'Caixa', rota: ROTAS.caixa, icone: 'caixa' }
    : { chave: 'custos', rotulo: 'Custos', rota: ROTAS.custos, icone: 'custos' };
}

export function itensDaTabBar(caps: Capacidades): ItemDaTabBar[] {
  return [
    { chave: 'inicio', rotulo: 'Início', rota: ROTAS.inicio, icone: 'inicio' },
    { chave: 'produtos', rotulo: 'Produtos', rota: ROTAS.produtos, icone: 'produtos' },
    atalhoDaTabBar(caps),
    { chave: 'mais', rotulo: 'Mais', rota: ROTAS.mais, icone: 'mais' },
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
export function itensDoMais(caps: Capacidades, chamadosNaoLidos = 0): ItemDoMais[] {
  const itens: ItemDoMais[] = [];

  if (caps.temCaixa) {
    itens.push({
      chave: 'caixa',
      nome: 'Caixa',
      descricao: 'Abrir, sangria e fechamento',
      rota: ROTAS.caixa,
      icone: 'caixa',
      badge: '',
    });
  }
  if (caps.temEstoque) {
    itens.push({
      chave: 'estoque',
      nome: 'Estoque',
      descricao: 'O que tem e o que falta',
      rota: ROTAS.estoque,
      icone: 'estoque',
      badge: '',
    });
  }
  if (caps.temCustos) {
    itens.push({
      chave: 'custos',
      nome: 'Custos',
      descricao: 'O que sai do seu bolso',
      rota: ROTAS.custos,
      icone: 'custos',
      badge: '',
    });
  }
  if (caps.temRelatorios) {
    itens.push({
      chave: 'relatorios',
      nome: 'Relatórios',
      descricao: 'Entrou, saiu e sobrou',
      rota: ROTAS.relatorios,
      icone: 'relatorios',
      badge: '',
    });
  }

  itens.push({
    chave: 'config',
    nome: 'Configurações',
    descricao: 'Negócio, equipe e plano',
    rota: ROTAS.config,
    icone: 'config',
    badge: '',
  });

  itens.push({
    chave: 'suporte',
    nome: 'Suporte',
    descricao: 'Fale com a gente',
    rota: ROTAS.suporte,
    icone: 'suporte',
    badge: chamadosNaoLidos > 0 ? String(chamadosNaoLidos) : '',
  });

  return itens;
}

/**
 * Guarda de rota por entitlement.
 *
 * Existe porque a rota é alcançável por deep link: `aguiarone://estoque` num
 * plano sem estoque abriria uma tela vazia e sem sentido. Aqui ela é barrada
 * antes de montar.
 */
export function rotaPermitida(rota: string, caps: Capacidades): boolean {
  switch (rota) {
    case ROTAS.caixa:
      return caps.temCaixa;
    case ROTAS.estoque:
      return caps.temEstoque;
    case ROTAS.custos:
      return caps.temCustos;
    case ROTAS.relatorios:
      return caps.temRelatorios;
    case ROTAS.suporte:
      return caps.temSuporte;
    default:
      return true;
  }
}

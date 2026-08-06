/** Ícones do design system, referenciados por nome pelas rotas e pela grade. */
export type NomeDeIcone =
  | 'inicio'
  | 'produtos'
  | 'caixa'
  | 'estoque'
  | 'custos'
  | 'relatorios'
  | 'config'
  | 'suporte'
  | 'mais'
  | 'carrinho';

export interface ItemDoMais {
  chave: string;
  nome: string;
  descricao: string;
  rota: string;
  icone: NomeDeIcone;
  /** Texto do badge vermelho; string vazia = sem badge. */
  badge: string;
}

export interface ItemDaTabBar {
  chave: string;
  rotulo: string;
  rota: string;
  icone: NomeDeIcone;
}

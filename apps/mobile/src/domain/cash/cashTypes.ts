/** MODELO DE DOMÍNIO do caixa. */

export interface RecebimentoPorForma {
  forma: string;
  valorCentavos: number;
}

export interface TurnoAberto {
  id: string;
  /** "08:12" — hora local já formatada pelo adapter. */
  abertoEm: string;
  aberturaCentavos: number;
  /** O que deveria estar fisicamente na gaveta agora. */
  gavetaCentavos: number;
  vendasEmDinheiroCentavos: number;
  recebimentos: RecebimentoPorForma[];
}

export interface TurnoEncerrado {
  id: string;
  /** "Ontem, 25/07". */
  dataRotulo: string;
  /** "08:05 → 18:40". */
  periodoRotulo: string;
  totalCentavos: number;
  diferencaCentavos: number;
}

export interface LinhaDeConferencia {
  /** "Dinheiro" | "Pix" | "Cartão" — o agrupamento que o dono confere. */
  forma: string;
  esperadoCentavos: number;
}

export interface DiferencaDeFechamento {
  /** `false` enquanto nenhum campo foi preenchido: a tela mostra R$ 0,00. */
  informado: boolean;
  diferencaCentavos: number;
}

export type TipoDeAjuste = 'sangria' | 'reforco';

export type CodigoErroCaixa =
  | 'caixa_fechado'
  | 'caixa_ja_aberto'
  | 'valor_invalido'
  | 'rede'
  | 'desconhecido';

export class CaixaError extends Error {
  constructor(readonly codigo: CodigoErroCaixa, mensagem?: string) {
    super(mensagem ?? codigo);
    this.name = 'CaixaError';
  }
}

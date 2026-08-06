/** MODELO DE DOMÍNIO dos relatórios. */

export type PeriodoRelatorio = 'hoje' | 'semana' | 'mes' | 'personalizado';

export const PERIODOS: { chave: PeriodoRelatorio; rotulo: string }[] = [
  { chave: 'hoje', rotulo: 'Hoje' },
  { chave: 'semana', rotulo: 'Esta semana' },
  { chave: 'mes', rotulo: 'Este mês' },
  { chave: 'personalizado', rotulo: 'Personalizado' },
];

/** Como a variação deve ser lida: crescer despesa não é boa notícia. */
export type TomDaVariacao = 'positivo' | 'atencao' | 'neutro';

export interface LinhaFinanceira {
  chave: string;
  rotulo: string;
  /** Já formatado quando não é dinheiro (ex.: "51,3%" da margem). */
  valorFormatado: string;
  variacao: string;
  tom: TomDaVariacao;
  /** 'texto' | 'dinheiro' | 'positivo' | 'negativo' — decide a cor do valor. */
  destaque: 'neutro' | 'positivo' | 'negativo';
}

export interface BarraDoDia {
  dia: string;
  valorCentavos: number;
  /** Altura relativa 0..1; a tela multiplica pela altura do gráfico. */
  proporcao: number;
  /** O maior dia da semana ganha o teal cheio. */
  destacada: boolean;
}

export interface ProdutoNoTopo {
  nome: string;
  quantidadeRotulo: string;
  totalCentavos: number;
}

export interface Relatorio {
  periodo: PeriodoRelatorio;
  financeiro: LinhaFinanceira[];
  barras: BarraDoDia[];
  topProdutos: ProdutoNoTopo[];
}

export function rotuloDoPeriodo(p: PeriodoRelatorio): string {
  return PERIODOS.find((x) => x.chave === p)?.rotulo ?? 'Esta semana';
}

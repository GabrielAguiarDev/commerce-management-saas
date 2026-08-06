/** MODELO DE DOMÍNIO do catálogo. */

export type SituacaoEstoque = 'em_dia' | 'baixo' | 'zerado';

export interface EstoqueDoProduto {
  quantidade: number;
  minimo: number;
  /** Derivada no adapter para que a tela não recalcule regra de estoque. */
  situacao: SituacaoEstoque;
}

export interface Produto {
  id: string;
  nome: string;
  /** Código de barras / SKU. Serviço não tem. */
  codigo: string | null;
  precoCentavos: number;
  custoCentavos: number | null;
  ehServico: boolean;
  favorito: boolean;
  /** `null` = produto que não controla estoque (serviço, ou módulo desligado). */
  estoque: EstoqueDoProduto | null;
  categoria: string | null;
}

/** Chips da tela Produtos. `especial` é "Serviços" ou "Bebidas" conforme o ramo. */
export type FiltroCatalogo = 'todos' | 'favoritos' | 'especial';

export interface CriterioCatalogo {
  busca: string;
  filtro: FiltroCatalogo;
  /** Rótulo do chip especial, que também define o critério aplicado. */
  categoriaEspecial: string | null;
}

export interface NovoProduto {
  nome: string;
  precoCentavos: number;
  custoCentavos: number | null;
  estoqueInicial: number | null;
  estoqueMinimo: number | null;
}

export type CodigoErroCatalogo = 'nome_obrigatorio' | 'preco_invalido' | 'rede' | 'desconhecido';

export class CatalogoError extends Error {
  constructor(readonly codigo: CodigoErroCatalogo, mensagem?: string) {
    super(mensagem ?? codigo);
    this.name = 'CatalogoError';
  }
}

/** MODELO DE DOMÍNIO dos custos. */

export type TipoDeCusto = 'fixo' | 'variavel';

export interface Custo {
  id: string;
  nome: string;
  valorCentavos: number;
  tipo: TipoDeCusto;
  /** "Fixo · todo mês" / "Variável" — rótulo pronto para o chip. */
  rotuloTipo: string;
  quando: string;
  /** Custo gerado automaticamente por uma entrada de estoque. */
  veioDoEstoque: boolean;
}

export interface ResumoDoMes {
  /** "Julho". */
  mes: string;
  /** "1 a 26". */
  periodo: string;
  entrouCentavos: number;
  saiuCentavos: number;
  sobrouCentavos: number;
}

export type FiltroCusto = 'todos' | 'fixos' | 'variaveis';

export type CodigoErroCusto = 'nome_obrigatorio' | 'valor_invalido' | 'rede';

export class CustoError extends Error {
  constructor(readonly codigo: CodigoErroCusto, mensagem?: string) {
    super(mensagem ?? codigo);
    this.name = 'CustoError';
  }
}

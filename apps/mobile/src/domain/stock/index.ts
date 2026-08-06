export type { Movimentacao } from './stockTypes';
export { EstoqueError } from './stockTypes';
export { formatarSinal, lerQuantidadeMovimento } from './stockAdapter';
export { estoqueKeys, useMovimentacoes, useRegistrarMovimentacao } from './useCases/useEstoque';

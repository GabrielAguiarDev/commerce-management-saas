export type {
  CriterioCatalogo,
  EstoqueDoProduto,
  FiltroCatalogo,
  NovoProduto,
  Produto,
  SituacaoEstoque,
} from './catalogTypes';
export { CatalogoError } from './catalogTypes';
export { situacaoDoEstoque } from './catalogAdapter';
export {
  buscaSemResultado,
  casaBusca,
  filtrarCatalogo,
  gradeDeVenda,
  produtosComEstoque,
  produtosEmAlerta,
  resumoDeEstoque,
  type ResumoEstoque,
} from './catalogSelectors';
export { categoriaEspecialDoTenant, validarNovoProduto } from './catalogService';
export {
  catalogoKeys,
  useAlternarFavorito,
  useCadastrarProduto,
  useCatalogo,
} from './useCases/useCatalogo';

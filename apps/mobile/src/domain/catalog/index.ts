export type {
  CatalogSortKey,
  ProductStock,
  CatalogFilter,
  NewProduct,
  Product,
  StockStatus,
} from './catalogTypes';
export { CatalogError } from './catalogTypes';
export { stockStatus } from './catalogAdapter';
export {
  searchHasNoResults,
  casaBusca,
  filterCatalog,
  saleGrid,
  productsInStock,
  lowStockProducts,
  specialCategoryOf,
  stockSummary,
  type StockSummary,
} from './catalogSelectors';
export { validateNewProduct } from './catalogService';
export {
  catalogoKeys,
  useToggleFavorite,
  useCreateProduct,
  useCatalog,
} from './useCases/useCatalog';

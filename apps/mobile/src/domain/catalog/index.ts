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
  stockSummary,
  type StockSummary,
} from './catalogSelectors';
export { tenantSpecialCategory, validateNewProduct } from './catalogService';
export {
  catalogoKeys,
  useToggleFavorite,
  useCreateProduct,
  useCatalog,
} from './useCases/useCatalog';

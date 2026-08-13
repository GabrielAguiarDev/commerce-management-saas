export type {
  CatalogSortKey,
  ProductStock,
  CatalogFilter,
  NewProduct,
  Product,
  ProductUpdate,
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
export { validateNewProduct, validateProductUpdate } from './catalogService';
export {
  catalogoKeys,
  useToggleFavorite,
  useCreateProduct,
  useUpdateProduct,
  useCatalog,
} from './useCases/useCatalog';

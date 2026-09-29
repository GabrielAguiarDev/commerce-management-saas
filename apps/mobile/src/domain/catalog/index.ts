export type {
  CatalogFacets,
  CatalogSortKey,
  ProductPageQuery,
  ProductsPage,
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
  specialCategoryFrom,
  stockSummary,
  type StockSummary,
} from './catalogSelectors';
export { CATALOG_PAGE_SIZE, validateNewProduct, validateProductUpdate } from './catalogService';
export {
  catalogoKeys,
  useToggleFavorite,
  useCreateProduct,
  useUpdateProduct,
  useCatalog,
  useCatalogFacets,
  useProductsPage,
} from './useCases/useCatalog';

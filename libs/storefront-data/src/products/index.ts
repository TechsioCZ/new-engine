export { createProductQueryKeys } from "./query-keys"
export { resolvePagination } from "./pagination"
export { createProductHooks } from "./hooks"
export { createMedusaProductService } from "./medusa-service"
export type {
  ProductDetailInputBase,
  ProductInfiniteInputBase,
  ProductListInputBase,
  ProductListResponse,
  ProductQueryKeys,
  ProductService,
  UseInfiniteProductsResult,
  UseProductsResult,
  UseProductResult,
  UseSuspenseProductsResult,
  UseSuspenseProductResult,
} from "./types"
export type {
  MedusaProductDetailInput,
  MedusaProductListInput,
  MedusaProductServiceConfig,
  MedusaProductTransformDetailContext,
  MedusaProductTransformListContext,
} from "./medusa-service"
export type {
  CreateProductHooksConfig,
  PrefetchListOptions,
  PrefetchProductOptions,
  UsePrefetchPagesParams,
} from "./hooks"

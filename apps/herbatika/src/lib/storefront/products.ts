import type { HttpTypes } from "@medusajs/types";
import {
  createMedusaProductService,
  createProductHooks,
  type MedusaProductDetailInput,
} from "@techsio/storefront-data";
import { storefrontCacheConfig } from "./cache";
import {
  buildProductListParams,
  DEFAULT_PRODUCT_PAGE_SIZE,
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  type StorefrontProductListInput,
} from "./product-query-config";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import { storefrontSdk } from "./sdk";

type ProductListInput = StorefrontProductListInput & {
  page?: number;
  enabled?: boolean;
};

type ProductDetailInput = MedusaProductDetailInput & {
  enabled?: boolean;
};

export const productService = createMedusaProductService<
  HttpTypes.StoreProduct,
  HttpTypes.StoreProductListParams,
  MedusaProductDetailInput
>(storefrontSdk, {
  defaultListFields:
    "id,title,handle,thumbnail,status,*variants.calculated_price,+metadata",
  defaultDetailFields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
});

export const productHooks = createProductHooks<
  HttpTypes.StoreProduct,
  ProductListInput,
  HttpTypes.StoreProductListParams,
  ProductDetailInput,
  MedusaProductDetailInput
>({
  service: productService,
  queryKeyNamespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  cacheConfig: storefrontCacheConfig,
  buildListParams: buildProductListParams,
  buildPrefetchParams: buildProductListParams,
  buildDetailParams: (input) => input,
  defaultPageSize: DEFAULT_PRODUCT_PAGE_SIZE,
});

export const {
  useProducts,
  useSuspenseProducts,
  useInfiniteProducts,
  useProduct,
  useSuspenseProduct,
  usePrefetchProducts,
  usePrefetchProduct,
  usePrefetchPages,
} = productHooks;

export { buildProductListParams, STOREFRONT_PRODUCT_DETAIL_FIELDS };
export type { ProductListInput, ProductDetailInput };

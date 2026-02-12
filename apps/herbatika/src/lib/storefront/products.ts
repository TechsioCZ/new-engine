import type { HttpTypes } from "@medusajs/types";
import {
  createMedusaProductService,
  createProductHooks,
  type MedusaProductDetailInput,
  type MedusaProductListInput,
} from "@techsio/storefront-data";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import { storefrontSdk } from "./sdk";

const DEFAULT_PAGE_SIZE = 12;

type ProductListInput = MedusaProductListInput & {
  page?: number;
  enabled?: boolean;
};

type ProductDetailInput = MedusaProductDetailInput & {
  enabled?: boolean;
};

const toProductListParams = (
  input: ProductListInput,
): MedusaProductListInput => {
  const { page, limit, offset, ...rest } = input;

  const resolvedLimit =
    typeof limit === "number" && limit > 0 ? limit : DEFAULT_PAGE_SIZE;
  const resolvedPage = typeof page === "number" && page > 0 ? page : 1;

  return {
    ...rest,
    limit: resolvedLimit,
    offset:
      typeof offset === "number" ? offset : (resolvedPage - 1) * resolvedLimit,
  };
};

export const productService = createMedusaProductService<
  HttpTypes.StoreProduct,
  MedusaProductListInput,
  MedusaProductDetailInput
>(storefrontSdk, {
  defaultListFields:
    "id,title,handle,thumbnail,status,*variants.calculated_price,+metadata",
  defaultDetailFields:
    "id,title,handle,description,thumbnail,images,*variants.calculated_price,+metadata",
});

export const productHooks = createProductHooks<
  HttpTypes.StoreProduct,
  ProductListInput,
  MedusaProductListInput,
  ProductDetailInput,
  MedusaProductDetailInput
>({
  service: productService,
  queryKeyNamespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  buildListParams: toProductListParams,
  buildPrefetchParams: toProductListParams,
  buildDetailParams: (input) => input,
  defaultPageSize: DEFAULT_PAGE_SIZE,
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

export type { ProductListInput, ProductDetailInput };

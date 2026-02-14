import type { HttpTypes } from "@medusajs/types";
import type { FindParams } from "@medusajs/types";
import {
  createCategoryHooks,
  createMedusaCategoryService,
  type MedusaCategoryDetailInput,
} from "@techsio/storefront-data";
import {
  buildCategoryListParams,
  DEFAULT_CATEGORY_PAGE_SIZE,
  type StorefrontCategoryListInput,
} from "./category-query-config";
import { storefrontCacheConfig } from "./cache";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import { storefrontSdk } from "./sdk";

type CategoryListInput = StorefrontCategoryListInput & {
  page?: number;
};

export const categoryService = createMedusaCategoryService<
  HttpTypes.StoreProductCategory,
  FindParams & HttpTypes.StoreProductCategoryListParams,
  MedusaCategoryDetailInput
>(storefrontSdk, {
  defaultListFields:
    "id,name,handle,parent_category_id,rank,is_active,category_children",
  defaultDetailFields:
    "id,name,handle,parent_category_id,rank,is_active,category_children",
});

export const categoryHooks = createCategoryHooks<
  HttpTypes.StoreProductCategory,
  CategoryListInput,
  FindParams & HttpTypes.StoreProductCategoryListParams,
  MedusaCategoryDetailInput,
  MedusaCategoryDetailInput
>({
  service: categoryService,
  queryKeyNamespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  cacheConfig: storefrontCacheConfig,
  buildListParams: buildCategoryListParams,
  buildDetailParams: (input) => input,
  defaultPageSize: DEFAULT_CATEGORY_PAGE_SIZE,
});

export const {
  useCategories,
  useSuspenseCategories,
  useCategory,
  useSuspenseCategory,
  usePrefetchCategories,
  usePrefetchCategory,
} = categoryHooks;

export type { CategoryListInput };

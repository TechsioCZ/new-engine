import type { HttpTypes } from "@medusajs/types";
import {
  createCategoryHooks,
  createMedusaCategoryService,
  type MedusaCategoryDetailInput,
  type MedusaCategoryListInput,
} from "@techsio/storefront-data";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import { storefrontSdk } from "./sdk";

const DEFAULT_PAGE_SIZE = 24;

type CategoryListInput = MedusaCategoryListInput & {
  page?: number;
};

const toCategoryListParams = (
  input: CategoryListInput,
): MedusaCategoryListInput => {
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

export const categoryService = createMedusaCategoryService<
  HttpTypes.StoreProductCategory,
  MedusaCategoryListInput,
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
  MedusaCategoryListInput,
  MedusaCategoryDetailInput,
  MedusaCategoryDetailInput
>({
  service: categoryService,
  queryKeyNamespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  buildListParams: toCategoryListParams,
  buildDetailParams: (input) => input,
  defaultPageSize: DEFAULT_PAGE_SIZE,
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

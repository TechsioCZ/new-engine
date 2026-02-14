import type { HttpTypes } from "@medusajs/types";

export const DEFAULT_PRODUCT_PAGE_SIZE = 12;

export const STOREFRONT_PRODUCT_DETAIL_FIELDS =
  "id,title,handle,description,thumbnail,*images,categories.id,categories.name,categories.handle,categories.parent_category_id,options.id,options.title,variants.id,variants.title,variants.options.value,variants.options.option_id,*variants.calculated_price,+metadata.short_description,+metadata.top_offer,+metadata.content_sections,+metadata.content_sections_map";

export type StorefrontProductListInput = HttpTypes.StoreProductListParams & {
  page?: number;
};

export const buildProductListParams = (
  input: StorefrontProductListInput,
): HttpTypes.StoreProductListParams => {
  const { page, limit, offset, ...rest } = input;

  const resolvedLimit =
    typeof limit === "number" && limit > 0 ? limit : DEFAULT_PRODUCT_PAGE_SIZE;
  const resolvedPage = typeof page === "number" && page > 0 ? page : 1;

  return {
    ...rest,
    limit: resolvedLimit,
    offset:
      typeof offset === "number" ? offset : (resolvedPage - 1) * resolvedLimit,
  };
};

import type { HttpTypes } from "@medusajs/types";

export const DEFAULT_PRODUCT_PAGE_SIZE = 12;

export const STOREFRONT_PRODUCT_CARD_FIELDS =
  "id,title,handle,thumbnail,*variants.calculated_price,+metadata.flags,+metadata.top_offer,+metadata.short_description,+metadata.content_sections_map";

export const STOREFRONT_PRODUCT_DETAIL_FIELDS =
  "id,title,handle,description,thumbnail,images.url,categories.id,categories.name,categories.handle,categories.parent_category_id,options.id,options.title,variants.id,variants.title,variants.sku,variants.ean,variants.options.value,variants.options.option_id,*variants.calculated_price,+variants.metadata,+metadata.short_description,+metadata.top_offer,+metadata.content_sections_map";

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

  const params: Record<string, unknown> = {
    ...rest,
    limit: resolvedLimit,
    offset:
      typeof offset === "number" ? offset : (resolvedPage - 1) * resolvedLimit,
  };

  const categoryIds = params.category_id;
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    // Medusa Store parser accepts multi-value `category_id[]` as CSV.
    params["category_id[]"] = categoryIds.join(",");
    delete params.category_id;
  }

  return params as HttpTypes.StoreProductListParams;
};

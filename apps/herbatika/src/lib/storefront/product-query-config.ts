import type { HttpTypes } from "@medusajs/types";

export const DEFAULT_PRODUCT_PAGE_SIZE = 12;

export const PRODUCT_VARIANT_INVENTORY_FIELDS =
  "+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder";

export const PRODUCT_CARD_FIELDS =
  `id,title,handle,thumbnail,*variants.calculated_price,${PRODUCT_VARIANT_INVENTORY_FIELDS},+metadata.flags,+metadata.top_offer,+metadata.short_description,+metadata.content_sections_map`;

export const SEARCH_PRODUCT_CARD_FIELDS =
  PRODUCT_CARD_FIELDS;

export const RELATED_PRODUCT_FIELDS =
  `${PRODUCT_CARD_FIELDS},+metadata.source_shopitem_id`;

export const PRODUCT_DETAIL_FIELDS =
  `${PRODUCT_CARD_FIELDS},description,images.url,categories.id,categories.name,categories.handle,categories.parent_category_id,producer.id,producer.title,producer.handle,options.id,options.title,variants.id,variants.title,variants.sku,variants.ean,variants.options.value,variants.options.option_id,+variants.metadata,+metadata.content_sections,+metadata.related_products,+metadata.alternative_products`;

export type StorefrontProductListInput = HttpTypes.StoreProductListParams & {
  handle?: string | string[];
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

  const handles = params.handle;
  if (Array.isArray(handles) && handles.length > 0) {
    params["handle[]"] = handles.join(",");
    delete params.handle;
  }

  return params as HttpTypes.StoreProductListParams;
};

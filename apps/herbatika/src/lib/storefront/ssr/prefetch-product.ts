import "server-only";

import { dehydrate } from "@techsio/storefront-data/server";
import { resolveRelatedCategoryIds } from "../category-tree";
import {
  STOREFRONT_PRODUCT_CARD_FIELDS,
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  buildProductListParams,
} from "../product-query-config";
import { PDP_RELATED_PRODUCTS_LIMIT } from "./constants";
import {
  getRegionServerContext,
  prefetchProductDetail,
  prefetchProductList,
} from "./context";
import type { ProductDetailParams } from "./types";

export const prefetchProductDetailPageStorefrontData = async (handle: string) => {
  const { queryClient, region } = await getRegionServerContext();

  if (region) {
    const detailParams: ProductDetailParams = {
      handle,
      fields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
      region_id: region.region_id,
      country_code: region.country_code,
    };

    const product = await prefetchProductDetail(queryClient, detailParams);
    const relatedCategoryIds = resolveRelatedCategoryIds(product);

    if (relatedCategoryIds.length > 0 && product?.id) {
      const relatedProductsListParams = buildProductListParams({
        page: 1,
        limit: PDP_RELATED_PRODUCTS_LIMIT,
        category_id: relatedCategoryIds,
        order: "-created_at",
        fields: STOREFRONT_PRODUCT_CARD_FIELDS,
        region_id: region.region_id,
        country_code: region.country_code,
      });

      await prefetchProductList(queryClient, relatedProductsListParams);
    }
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  };
};

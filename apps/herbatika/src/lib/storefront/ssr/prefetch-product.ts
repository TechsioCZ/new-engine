import "server-only"
import { dehydrate } from "@tanstack/react-query"

import { resolveRelatedCategoryIds } from "../category-tree"
import {
  buildProductListParams,
  PRODUCT_CARD_FIELDS,
  PRODUCT_DETAIL_FIELDS,
} from "../product-query-config"
import { RELATED_PRODUCTS_LIMIT } from "../related-products-config"
import { PRODUCT_REVIEWS_PAGE_SIZE } from "../review-query-config"
import {
  getRegionServerContext,
  prefetchProductAttributes,
  prefetchProductDetail,
  prefetchProductList,
  prefetchProductReviews,
} from "./context"
import type { ProductDetailParams } from "./types"

export const prefetchProductDetailPageStorefrontData = async (
  handle: string,
) => {
  const { queryClient, region } = await getRegionServerContext()

  if (region) {
    const detailParams: ProductDetailParams = {
      fields: PRODUCT_DETAIL_FIELDS,
      handle,
      ...(region.region_id === undefined
        ? {}
        : { region_id: region.region_id }),
      ...(region.country_code === undefined
        ? {}
        : { country_code: region.country_code }),
    }

    const product = await prefetchProductDetail(queryClient, detailParams)
    const relatedCategoryIds = resolveRelatedCategoryIds(product)
    const productId = product?.id

    if (typeof productId === "string" && productId.length > 0) {
      await Promise.all([
        prefetchProductAttributes(queryClient, productId),
        prefetchProductReviews(queryClient, {
          limit: PRODUCT_REVIEWS_PAGE_SIZE,
          offset: 0,
          productId,
        }),
      ])
    }

    if (
      relatedCategoryIds.length > 0 &&
      typeof productId === "string" &&
      productId.length > 0
    ) {
      const relatedProductsListParams = buildProductListParams({
        category_id: relatedCategoryIds,
        fields: PRODUCT_CARD_FIELDS,
        limit: RELATED_PRODUCTS_LIMIT,
        order: "-created_at",
        page: 1,
        ...(region.region_id === undefined
          ? {}
          : { region_id: region.region_id }),
        ...(region.country_code === undefined
          ? {}
          : { country_code: region.country_code }),
      })

      await prefetchProductList(queryClient, relatedProductsListParams)
    }
  }

  return {
    dehydratedState: dehydrate(queryClient),
    region,
  }
}

import "server-only"

import { dehydrate } from "@tanstack/react-query"
import { resolveRelatedCategoryIds } from "../category-tree"
import {
  buildProductListParams,
  PRODUCT_CARD_FIELDS,
  PRODUCT_DETAIL_FIELDS,
} from "../product-query-config"
import { PRODUCT_REVIEWS_PAGE_SIZE } from "../review-query-config"
import { PDP_RELATED_PRODUCTS_LIMIT } from "./constants"
import {
  getRegionServerContext,
  prefetchProductDetail,
  prefetchProductList,
  prefetchProductReviews,
} from "./context"
import type { ProductDetailParams } from "./types"

export const prefetchProductDetailPageStorefrontData = async (
  handle: string
) => {
  const { queryClient, region } = await getRegionServerContext()

  if (region) {
    const detailParams: ProductDetailParams = {
      handle,
      fields: PRODUCT_DETAIL_FIELDS,
      region_id: region.region_id,
      country_code: region.country_code,
    }

    const product = await prefetchProductDetail(queryClient, detailParams)
    const relatedCategoryIds = resolveRelatedCategoryIds(product)

    if (product?.id) {
      await prefetchProductReviews(queryClient, {
        productId: product.id,
        limit: PRODUCT_REVIEWS_PAGE_SIZE,
        offset: 0,
      })
    }

    if (relatedCategoryIds.length > 0 && product?.id) {
      const relatedProductsListParams = buildProductListParams({
        page: 1,
        limit: PDP_RELATED_PRODUCTS_LIMIT,
        category_id: relatedCategoryIds,
        order: "-created_at",
        fields: PRODUCT_CARD_FIELDS,
        region_id: region.region_id,
        country_code: region.country_code,
      })

      await prefetchProductList(queryClient, relatedProductsListParams)
    }
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  }
}

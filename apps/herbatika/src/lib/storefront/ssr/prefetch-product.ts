// Pages Router rejects the App-Router-only `server-only` marker. Keep this
// module reachable only from server entry points.

import { dehydrate } from "@tanstack/react-query"
import { resolveRelatedCategoryIds } from "../category-tree"
import {
  buildProductListParams,
  PRODUCT_CARD_FIELDS,
  PRODUCT_DETAIL_FIELDS,
} from "../product-query-config"
import { RELATED_PRODUCTS_LIMIT } from "../related-products-config"
import { isProductReviewMarketSupported } from "../review-market-policy"
import { PRODUCT_REVIEWS_PAGE_SIZE } from "../review-query-config"
import {
  type ExplicitRequestServerContext,
  getRegionServerContext,
  prefetchProductAttributes,
  prefetchProductDetail,
  prefetchProductList,
  prefetchProductReviews,
} from "./context"
import type { ProductDetailParams } from "./types"

export const prefetchProductDetailPageStorefrontData = async (
  handle: string,
  requestContext: ExplicitRequestServerContext
) => {
  const { locale, market, queryClient, region } =
    await getRegionServerContext(requestContext)

  if (region) {
    const detailParams: ProductDetailParams = {
      handle,
      fields: PRODUCT_DETAIL_FIELDS,
      locale,
      region_id: region.region_id,
      country_code: region.country_code,
    }

    const product = await prefetchProductDetail(
      market,
      queryClient,
      detailParams
    )
    const relatedCategoryIds = resolveRelatedCategoryIds(product)

    if (product?.id) {
      await Promise.all([
        prefetchProductAttributes(market, queryClient, product.id),
        ...(isProductReviewMarketSupported(market)
          ? [
              prefetchProductReviews(market, queryClient, {
                productId: product.id,
                locale,
                limit: PRODUCT_REVIEWS_PAGE_SIZE,
                offset: 0,
              }),
            ]
          : []),
      ])
    }

    if (relatedCategoryIds.length > 0 && product?.id) {
      const relatedProductsListParams = buildProductListParams({
        page: 1,
        limit: RELATED_PRODUCTS_LIMIT,
        category_id: relatedCategoryIds,
        order: "-created_at",
        fields: PRODUCT_CARD_FIELDS,
        locale,
        region_id: region.region_id,
        country_code: region.country_code,
      })

      await prefetchProductList(market, queryClient, relatedProductsListParams)
    }
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  }
}

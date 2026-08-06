import { dehydrate } from "@tanstack/react-query"
import { assertServerOnly } from "@/lib/server-guard"
import { resolveRelatedCategoryIds } from "../category-tree"
import type { RequestServerContext } from "../market-context.server"
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

assertServerOnly("storefront/ssr/prefetch-product")

export const prefetchProductDetailPageStorefrontData = async (
  requestContext: RequestServerContext,
  handle: string
) => {
  const { queryClient, region } = await getRegionServerContext(requestContext)

  if (region) {
    const detailParams: ProductDetailParams = {
      handle,
      fields: PRODUCT_DETAIL_FIELDS,
      region_id: region.region_id,
      country_code: region.country_code,
    }

    const product = await prefetchProductDetail(
      queryClient,
      detailParams,
      requestContext
    )
    const relatedCategoryIds = resolveRelatedCategoryIds(product)

    if (product?.id) {
      await Promise.all([
        prefetchProductAttributes(queryClient, product.id),
        prefetchProductReviews(queryClient, {
          productId: product.id,
          limit: PRODUCT_REVIEWS_PAGE_SIZE,
          offset: 0,
        }),
      ])
    }

    if (relatedCategoryIds.length > 0 && product?.id) {
      const relatedProductsListParams = buildProductListParams({
        page: 1,
        limit: RELATED_PRODUCTS_LIMIT,
        category_id: relatedCategoryIds,
        order: "-created_at",
        fields: PRODUCT_CARD_FIELDS,
        region_id: region.region_id,
        country_code: region.country_code,
      })

      await prefetchProductList(
        queryClient,
        relatedProductsListParams,
        requestContext
      )
    }
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  }
}

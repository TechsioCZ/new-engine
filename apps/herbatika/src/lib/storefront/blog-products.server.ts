import "server-only"

import type { HttpTypes } from "@medusajs/types"
import type { BlogProductReference } from "./blog-content"
import { indexBlogProducts } from "./blog-product-references"
import { PRODUCT_CARD_FIELDS } from "./product-query-config"
import { getRegionServerContext } from "./ssr/context"
import { fetchServerProducts } from "./storefront-server"

const BLOG_PRODUCT_CARD_FIELDS = `${PRODUCT_CARD_FIELDS},external_id`

export const resolveBlogProducts = async (
  references: BlogProductReference[]
) => {
  const externalIds = [
    ...new Set(
      references
        .map(({ productExternalId }) => productExternalId?.trim())
        .filter((value): value is string => Boolean(value))
    ),
  ]
  const explicitHandles = references
    .map(({ productSlug }) => productSlug?.trim())
    .filter((value): value is string => Boolean(value))

  if (externalIds.length === 0 && explicitHandles.length === 0) {
    return new Map<string, HttpTypes.StoreProduct>()
  }

  let serverContext: Awaited<ReturnType<typeof getRegionServerContext>>
  try {
    serverContext = await getRegionServerContext()
  } catch {
    return new Map<string, HttpTypes.StoreProduct>()
  }

  const { queryClient, region } = serverContext
  const regionParams = {
    country_code: region?.country_code,
    region_id: region?.region_id,
    fields: BLOG_PRODUCT_CARD_FIELDS,
  }
  const productMap = new Map<string, HttpTypes.StoreProduct>()

  const fetchProducts = async (
    params: Parameters<typeof fetchServerProducts>[1]
  ) => {
    try {
      const response = await fetchServerProducts(queryClient, params)
      indexBlogProducts(productMap, response.products)
    } catch {
      // Product recommendations are optional; article content remains available.
    }
  }

  if (externalIds.length > 0) {
    await fetchProducts({
      ...regionParams,
      external_id: externalIds,
      limit: externalIds.length,
    })
  }

  const fallbackHandles = externalIds
    .filter((externalId) => !productMap.has(`external:${externalId}`))
    .map((externalId) => `shopitem-${externalId}`)
  const handles = [...new Set([...explicitHandles, ...fallbackHandles])]

  if (handles.length > 0) {
    await fetchProducts({
      ...regionParams,
      handle: handles,
      limit: handles.length,
    })
  }

  return productMap
}

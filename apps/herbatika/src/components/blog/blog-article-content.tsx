import type { HttpTypes } from "@medusajs/types"
import type {
  BlogArticleContentSegment,
  BlogPost,
} from "@/lib/storefront/blog-content"
import {
  indexBlogProducts,
  resolveBlogProductReference,
} from "@/lib/storefront/blog-product-references"
import { PRODUCT_CARD_FIELDS } from "@/lib/storefront/product-query-config"
import { getRegionServerContext } from "@/lib/storefront/ssr/context"
import { fetchServerProducts } from "@/lib/storefront/storefront-server"
import { InlineProductsCarousel } from "./inline-products-carousel"
import { BlogRichText } from "./blog-rich-text"

type BlogArticleContentProps = {
  post: BlogPost
}

const ARTICLE_CONTENT_CLASS =
  "rounded-2xl border border-border-secondary bg-surface p-400 md:p-500"
const BLOG_PRODUCT_CARD_FIELDS = `${PRODUCT_CARD_FIELDS},external_id`

const resolveProducts = async (segments: BlogArticleContentSegment[]) => {
  const references = segments.flatMap((segment) =>
    segment.type === "productCarousel" ? segment.products : []
  )
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
      // Product blocks are optional; article HTML remains available.
    }
  }

  if (externalIds.length > 0) {
    await fetchProducts({
      ...regionParams,
      external_id: externalIds,
      limit: externalIds.length,
    })
  }

  const missingExternalIdHandles = externalIds
    .filter((externalId) => !productMap.has(`external:${externalId}`))
    .map((externalId) => `shopitem-${externalId}`)
  const handles = [
    ...new Set([...explicitHandles, ...missingExternalIdHandles]),
  ]

  if (handles.length > 0) {
    await fetchProducts({
      ...regionParams,
      handle: handles,
      limit: handles.length,
    })
  }

  return productMap
}

export async function BlogArticleContent({ post }: BlogArticleContentProps) {
  const segments = post.contentSegments
  if (segments.length === 0) {
    return null
  }

  const products = await resolveProducts(segments)

  return (
    <div className="space-y-400">
      {segments.map((segment, index) => {
        if (segment.type === "html") {
          return (
            <article className={ARTICLE_CONTENT_CLASS} key={`html-${index}`}>
              <BlogRichText
                className="[&_h2]:scroll-mt-500 [&_h3]:scroll-mt-500"
                html={segment.html}
              />
            </article>
          )
        }

        const segmentProducts = segment.products.flatMap((reference) => {
          const product = resolveBlogProductReference(reference, products)
          return product ? [product] : []
        })

        return (
          <InlineProductsCarousel
            key={`products-${index}`}
            keyPrefix={`article-products-${index}`}
            products={segmentProducts}
          />
        )
      })}
    </div>
  )
}

import type { BlogPost } from "@/lib/storefront/blog-content"
import {
  type BlogProductLookup,
  resolveBlogProductReference,
} from "@/lib/storefront/blog-product-references"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import { BlogRichText } from "./blog-rich-text"
import { InlineProductsCarousel } from "./inline-products-carousel"

type BlogArticleContentProps = {
  post: BlogPost
  productPublicSlugsById: PublicEntitySlugMap
  products: BlogProductLookup
}

const ARTICLE_CONTENT_CLASS =
  "rounded-2xl border border-border-secondary bg-surface p-400 md:p-500"
export function BlogArticleContent({
  post,
  productPublicSlugsById,
  products,
}: BlogArticleContentProps) {
  const segments = post.contentSegments
  if (segments.length === 0) {
    return null
  }

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
            productPublicSlugsById={productPublicSlugsById}
            products={segmentProducts}
          />
        )
      })}
    </div>
  )
}

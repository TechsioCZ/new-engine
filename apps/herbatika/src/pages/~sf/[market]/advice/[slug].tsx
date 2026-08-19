import type { HttpTypes } from "@medusajs/types"
import type { GetServerSideProps } from "next"
import { BlogDetailPage } from "@/components/blog/blog-detail-page"
import {
  type PublicPageProps,
  resolveEntityPublicPage,
} from "@/lib/routing/public-page"
import { resolveBlogProductReference } from "@/lib/storefront/blog-product-references"
import { resolveBlogProducts } from "@/lib/storefront/blog-products.server"
import { type CmsBlogPost, fetchCmsBlogPostById } from "@/lib/storefront/cms"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"
import {
  type PublicEntitySlugMap,
  readRequiredPublicEntitySlugs,
} from "@/lib/storefront/ssr/public-entity-projections"

type AdviceValue = Readonly<{
  articlePublicSlugsById: PublicEntitySlugMap
  post: CmsBlogPost
  productEntries: [string, HttpTypes.StoreProduct][]
  productPublicSlugsById: PublicEntitySlugMap
}>

type Props = PublicPageProps<AdviceValue>

export const getServerSideProps = (async (context) =>
  resolveEntityPublicPage<AdviceValue>(context, {
    expectedRouteKey: "article.detail",
    kind: "article",
    loadSource: async ({ market, sourceId }) => {
      const post = await fetchCmsBlogPostById(
        sourceId,
        getHerbatikaMarketContext(market).locale
      )
      if (!post) {
        return { kind: "missing" } as const
      }
      const productReferences = post.contentSegments.flatMap((segment) =>
        segment.type === "productCarousel" ? segment.products : []
      )
      if (post.sidebar?.product) {
        productReferences.push(post.sidebar.product)
      }
      const products = await resolveBlogProducts(productReferences, {
        cookieHeader: context.req.headers.cookie,
        market,
      })
      const resolvedProducts = productReferences.map((reference) =>
        resolveBlogProductReference(reference, products)
      )
      if (resolvedProducts.some((product) => !product)) {
        return {
          causeCode: "INCOMPLETE_ARTICLE_PRODUCT_SOURCE",
          kind: "invalid-response",
        } as const
      }
      const productSourceIds = Array.from(
        new Set(
          resolvedProducts.flatMap((product) => (product ? [product.id] : []))
        )
      )
      const [articlePublicSlugsById, productPublicSlugsById] =
        await Promise.all([
          readRequiredPublicEntitySlugs({
            kind: "article",
            market,
            requiredSourceIds: [
              post.sourceId,
              ...post.relatedPosts.map((relatedPost) => relatedPost.sourceId),
            ],
          }),
          readRequiredPublicEntitySlugs({
            kind: "product",
            market,
            requiredSourceIds: productSourceIds,
          }),
        ])
      if (articlePublicSlugsById.kind !== "found") {
        return articlePublicSlugsById
      }
      if (productPublicSlugsById.kind !== "found") {
        return productPublicSlugsById
      }
      return {
        kind: "found",
        value: {
          articlePublicSlugsById: articlePublicSlugsById.value,
          post,
          productEntries: Array.from(products.entries()),
          productPublicSlugsById: productPublicSlugsById.value,
        },
      } as const
    },
    queryKind: "advice-article",
    title: ({ post }) => post.title,
  })) satisfies GetServerSideProps<Props>

export default function AdviceDetailPage({ page }: Props) {
  if (page.kind === "error") {
    return <main data-status={page.status}>Article unavailable.</main>
  }
  return (
    <BlogDetailPage
      articlePublicSlugsById={page.value.articlePublicSlugsById}
      post={page.value.post}
      productEntries={page.value.productEntries}
      productPublicSlugsById={page.value.productPublicSlugsById}
    />
  )
}

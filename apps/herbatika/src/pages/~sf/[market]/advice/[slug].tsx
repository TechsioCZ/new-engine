import type { HttpTypes } from "@medusajs/types"
import type { GetServerSideProps } from "next"
import { BlogDetailPage } from "@/components/blog/blog-detail-page"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
import {
  foundSource,
  notFoundResult,
  type PublicPageProps,
  resolveStaticPublicPage,
} from "@/lib/routing/public-page"
import { resolveBlogProducts } from "@/lib/storefront/blog-products.server"
import { type CmsBlogPost, fetchCmsBlogPost } from "@/lib/storefront/cms"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projections"
import { validatePublishedSlug } from "@/lib/url/slug"

type AdviceValue = Readonly<{
  articlePublicSlugsById: PublicEntitySlugMap
  post: CmsBlogPost
  productEntries: [string, HttpTypes.StoreProduct][]
  productPublicSlugsById: PublicEntitySlugMap
}>

type Props = PublicPageProps<AdviceValue>

const singleValue = (value: string | string[] | undefined): string | null =>
  typeof value === "string" ? value : null

// Without the URL registry, an article's own CMS slug IS its public slug
// (registry-projected slugs are unavailable while URL_REGISTRY_ENABLED=0).
export const getServerSideProps = (async (context) => {
  const slugParam = singleValue(context.params?.slug)
  if (!slugParam) {
    return notFoundResult(context)
  }
  const slug = slugParam.toLowerCase()
  try {
    validatePublishedSlug(slug)
  } catch {
    return notFoundResult(context)
  }

  return await resolveStaticPublicPage<AdviceValue>(context, {
    expectedRouteKey: "article.detail",
    loadSource: async (market) => {
      const post = await fetchCmsBlogPost(
        slug,
        undefined,
        undefined,
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

      // Unresolved inline product refs are skipped by the components below
      // (resolveBlogProductReference returns undefined for them) rather than
      // failing the page.
      const articlePublicSlugsById: PublicEntitySlugMap = Object.fromEntries([
        [post.sourceId, post.slug],
        ...post.relatedPosts.map(
          (relatedPost) => [relatedPost.sourceId, relatedPost.slug] as const
        ),
      ])
      const productPublicSlugsById: PublicEntitySlugMap = Object.fromEntries(
        Array.from(products.values())
          .filter((product) => Boolean(product.handle))
          .map((product) => [product.id, product.handle as string])
      )

      return foundSource({
        articlePublicSlugsById,
        post,
        productEntries: Array.from(products.entries()),
        productPublicSlugsById,
      })
    },
    path: { kind: "article", slug },
    queryKind: "advice-article",
    title: ({ post }) => post.title,
  })
}) satisfies GetServerSideProps<Props>

export default function AdviceDetailPage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="advice" />
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

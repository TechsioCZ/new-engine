import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Suspense } from "react"
import { BlogDetailPage } from "@/components/blog/blog-detail-page"
import { resolveBlogProducts } from "@/lib/storefront/blog-products.server"
import { fetchCmsBlogPost } from "@/lib/storefront/cms"
import { getMarketServerContext } from "@/lib/storefront/market-context.server"

type BlogDetailRouteProps = {
  params: Promise<{
    slug: string
  }>
}

function BlogDetailPageFallback() {
  return <main className="mx-auto min-h-dvh w-full max-w-max-w" />
}

async function BlogDetailPageContent({ params }: BlogDetailRouteProps) {
  await connection()
  const { slug } = await params
  const marketContext = await getMarketServerContext()
  const post = await fetchCmsBlogPost(
    slug,
    undefined,
    undefined,
    marketContext.locale
  )

  if (!post) {
    notFound()
  }

  const productReferences = post.contentSegments.flatMap((segment) =>
    segment.type === "productCarousel" ? segment.products : []
  )
  if (post.sidebar?.product) {
    productReferences.push(post.sidebar.product)
  }
  const requestHeaders = await headers()
  const products = await resolveBlogProducts(productReferences, {
    cookieHeader: requestHeaders.get("cookie") ?? undefined,
    market: marketContext.code,
  })
  const articlePublicSlugsById = Object.fromEntries([
    [post.sourceId, post.slug],
    ...post.relatedPosts.map((relatedPost) => [
      relatedPost.sourceId,
      relatedPost.slug,
    ]),
  ])
  const productPublicSlugsById = Object.fromEntries(
    Array.from(products.values()).flatMap((product) =>
      product.id && product.handle ? [[product.id, product.handle]] : []
    )
  )

  return (
    <BlogDetailPage
      articlePublicSlugsById={articlePublicSlugsById}
      post={post}
      productEntries={Array.from(products.entries())}
      productPublicSlugsById={productPublicSlugsById}
    />
  )
}

export default function BlogDetailPageRoute(props: BlogDetailRouteProps) {
  return (
    <Suspense fallback={<BlogDetailPageFallback />}>
      <BlogDetailPageContent {...props} />
    </Suspense>
  )
}

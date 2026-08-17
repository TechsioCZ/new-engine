import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Suspense } from "react"
import { BlogDetailPage } from "@/components/blog/blog-detail-page"
import { fetchCmsBlogPost } from "@/lib/storefront/cms"
import { getCmsLocaleForMarket } from "@/lib/storefront/cms-locale"
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
    getCmsLocaleForMarket(marketContext.code)
  )

  if (!post) {
    notFound()
  }

  return <BlogDetailPage post={post} />
}

export default function BlogDetailPageRoute(props: BlogDetailRouteProps) {
  return (
    <Suspense fallback={<BlogDetailPageFallback />}>
      <BlogDetailPageContent {...props} />
    </Suspense>
  )
}

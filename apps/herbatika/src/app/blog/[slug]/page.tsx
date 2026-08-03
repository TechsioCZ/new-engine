import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Suspense } from "react"
import { BlogDetailPage } from "@/components/blog/blog-detail-page"
import {
  fetchCmsBlogCategoryFilters,
  fetchCmsBlogPost,
} from "@/lib/storefront/cms"

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
  const post = await fetchCmsBlogPost(slug)

  if (!post) {
    notFound()
  }

  const categories = await fetchCmsBlogCategoryFilters().catch(() => [])

  return <BlogDetailPage categories={categories} post={post} />
}

export default function BlogDetailPageRoute(props: BlogDetailRouteProps) {
  return (
    <Suspense fallback={<BlogDetailPageFallback />}>
      <BlogDetailPageContent {...props} />
    </Suspense>
  )
}

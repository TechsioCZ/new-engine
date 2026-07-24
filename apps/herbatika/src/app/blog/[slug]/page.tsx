import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Suspense } from "react"
import { BlogDetailPage } from "@/components/blog/blog-detail-page"
import {
  fetchCmsBlogCategoryFilters,
  fetchCmsBlogPost,
  fetchRandomCmsBlogPosts,
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

  const [categories, relatedPosts] = await Promise.all([
    fetchCmsBlogCategoryFilters().catch(() => []),
    fetchRandomCmsBlogPosts(4, [post.slug]).catch(() => []),
  ])

  return (
    <BlogDetailPage
      categories={categories}
      post={post}
      relatedPosts={relatedPosts}
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

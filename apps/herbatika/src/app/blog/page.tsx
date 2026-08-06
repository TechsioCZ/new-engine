import { getRecordValue } from "@techsio/std/object"
import { connection } from "next/server"
import { Suspense } from "react"

import { BlogListingPage } from "@/components/blog/blog-listing-page"
import { resolveBlogListing } from "@/lib/storefront/blog-content"
import type { BlogTopicKey } from "@/lib/storefront/blog-content"
import { fetchCmsBlogPosts } from "@/lib/storefront/cms"

interface BlogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string")

const parseTopic = (value: string | undefined): BlogTopicKey => {
  if (value === "fitness" || value === "krasa" || value === "zdravie") {
    return value
  }

  return "all"
}

const parsePage = (value: string | undefined) => {
  if ((value ?? "").length <= 0) {
    return 1
  }

  const parsed = Math.trunc(Number(value))
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1
  }

  return parsed
}

const BlogPageFallback = () => (
  <main className="mx-auto min-h-dvh w-full max-w-max-w" />
)

const BlogPageContent = async ({ searchParams }: BlogPageProps) => {
  await connection()
  const resolvedSearchParams = await searchParams
  const rawTopic = getRecordValue(resolvedSearchParams, "topic")
  const rawPage = getRecordValue(resolvedSearchParams, "page")

  const topicValue = isStringArray(rawTopic) ? rawTopic[0] : rawTopic
  const pageValue = isStringArray(rawPage) ? rawPage[0] : rawPage
  const topic = parseTopic(
    typeof topicValue === "string" ? topicValue : undefined,
  )
  const page = parsePage(typeof pageValue === "string" ? pageValue : undefined)
  const cmsPosts = await fetchCmsBlogPosts()

  const listing = resolveBlogListing({
    page,
    ...(cmsPosts.length > 0 ? { posts: cmsPosts } : {}),
    topic,
  })

  return <BlogListingPage listing={listing} />
}

const BlogPageRoute = (props: BlogPageProps) => (
  <Suspense fallback={<BlogPageFallback />}>
    <BlogPageContent {...props} />
  </Suspense>
)

export default BlogPageRoute

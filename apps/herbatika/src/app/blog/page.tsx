import { connection } from "next/server"
import { Suspense } from "react"
import { BlogListingPage } from "@/components/blog/blog-listing-page"
import { loadBlogQueryState } from "@/lib/storefront/blog-query-state.server"
import { fetchCmsBlogListing } from "@/lib/storefront/cms"

type BlogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function BlogPageFallback() {
  return <main className="mx-auto min-h-dvh w-full max-w-max-w" />
}

async function BlogPageContent({ searchParams }: BlogPageProps) {
  await connection()
  const { category, page } = await loadBlogQueryState(searchParams)
  const listing = await fetchCmsBlogListing({
    category,
    page,
  })

  return <BlogListingPage listing={listing} />
}

export default function BlogPageRoute(props: BlogPageProps) {
  return (
    <Suspense fallback={<BlogPageFallback />}>
      <BlogPageContent {...props} />
    </Suspense>
  )
}

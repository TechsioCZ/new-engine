import { connection } from "next/server"
import { Suspense } from "react"
import { BlogListingPage } from "@/components/blog/blog-listing-page"
import { loadBlogQueryState } from "@/lib/storefront/blog-query-state.server"
import { fetchCmsBlogListing } from "@/lib/storefront/cms"
import { getMarketServerContext } from "@/lib/storefront/market-context.server"

type BlogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function BlogPageFallback() {
  return <main className="mx-auto min-h-dvh w-full max-w-max-w" />
}

async function BlogPageContent({ searchParams }: BlogPageProps) {
  await connection()
  const [{ category, page }, marketContext] = await Promise.all([
    loadBlogQueryState(searchParams),
    getMarketServerContext(),
  ])
  const listing = await fetchCmsBlogListing({
    category,
    locale: marketContext.locale,
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

import { connection } from "next/server"
import { Suspense } from "react"
import { BlogListingPage } from "@/components/blog/blog-listing-page"
import { fetchCmsBlogListing } from "@/lib/storefront/cms"

type BlogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const parsePage = (value: string | undefined) => {
  if (!value) {
    return 1
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1
  }

  return parsed
}

function BlogPageFallback() {
  return <main className="mx-auto min-h-dvh w-full max-w-max-w" />
}

async function BlogPageContent({ searchParams }: BlogPageProps) {
  await connection()
  const resolvedSearchParams = await searchParams
  const rawCategory = resolvedSearchParams.category
  const rawPage = resolvedSearchParams.page

  const category = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory
  const page = parsePage(Array.isArray(rawPage) ? rawPage[0] : rawPage)
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

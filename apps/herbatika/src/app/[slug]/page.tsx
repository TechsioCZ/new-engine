import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CmsPageSurface } from "@/components/cms/cms-page-surface"
import { fetchCmsPageBySlug } from "@/lib/storefront/cms"
import { getMarketServerContext } from "@/lib/storefront/market-context.server"

type CmsPageRouteProps = {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({
  params,
}: CmsPageRouteProps): Promise<Metadata> {
  const [{ slug }, marketContext] = await Promise.all([
    params,
    getMarketServerContext(),
  ])
  const page = await fetchCmsPageBySlug(slug, marketContext.locale)

  if (!page) {
    return {}
  }

  return {
    description: page.meta?.description ?? undefined,
    title: page.meta?.title ?? page.title ?? undefined,
  }
}

export default async function CmsPageRoute({ params }: CmsPageRouteProps) {
  const [{ slug }, marketContext] = await Promise.all([
    params,
    getMarketServerContext(),
  ])
  const page = await fetchCmsPageBySlug(slug, marketContext.locale)

  if (!page) {
    notFound()
  }

  return <CmsPageSurface page={page} />
}

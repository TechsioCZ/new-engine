import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CmsPageSurface } from "@/components/cms/cms-page-surface"
import { fetchCmsPageBySlug } from "@/lib/storefront/cms"

interface CmsPageRouteProps {
  params: Promise<{
    slug: string
  }>
}

export const generateMetadata = async ({
  params,
}: CmsPageRouteProps): Promise<Metadata> => {
  const { slug } = await params
  const page = await fetchCmsPageBySlug(slug)

  if (!page) {
    return {}
  }

  return {
    description: page.meta?.description ?? undefined,
    title: page.meta?.title ?? page.title ?? undefined,
  }
}

const CmsPageRoute = async ({ params }: CmsPageRouteProps) => {
  const { slug } = await params
  const page = await fetchCmsPageBySlug(slug)

  if (!page) {
    notFound()
  }

  return <CmsPageSurface page={page} />
}

export default CmsPageRoute

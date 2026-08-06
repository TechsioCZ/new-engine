import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CmsPageArticle } from "@/components/cms-page-article"
import { getCmsPage } from "@/services/cms-service"

interface CmsDynamicPageProps {
  params: Promise<{
    slug: string
  }>
}

export const generateMetadata = async ({
  params,
}: CmsDynamicPageProps): Promise<Metadata> => {
  const { slug } = await params
  const page = await getCmsPage(slug)

  if (!page) {
    return {}
  }

  return {
    description: page.meta?.description ?? undefined,
    title: page.meta?.title ?? page.title,
  }
}

const CmsDynamicPage = async ({ params }: CmsDynamicPageProps) => {
  const { slug } = await params
  const page = await getCmsPage(slug)

  if (!page) {
    notFound()
  }

  return <CmsPageArticle page={page} />
}

export default CmsDynamicPage

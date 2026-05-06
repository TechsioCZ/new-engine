import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CmsPageArticle } from "@/components/cms-page-article"
import { getCmsPage } from "@/services/cms-service"

type CmsDynamicPageProps = {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({
  params,
}: CmsDynamicPageProps): Promise<Metadata> {
  const { slug } = await params
  const page = await getCmsPage(slug)

  if (!page) {
    return {}
  }

  return {
    title: page.meta?.title || page.title,
    description: page.meta?.description || undefined,
  }
}

export default async function CmsDynamicPage({ params }: CmsDynamicPageProps) {
  const { slug } = await params
  const page = await getCmsPage(slug)

  if (!page) {
    notFound()
  }

  return <CmsPageArticle page={page} />
}

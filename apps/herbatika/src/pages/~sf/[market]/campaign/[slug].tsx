import type { GetServerSideProps } from "next"
import { CmsPageSurface } from "@/components/cms/cms-page-surface"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
import {
  type PublicPageProps,
  resolveEntityPublicPage,
} from "@/lib/routing/public-page"
import {
  type CampaignPublicationPageValue,
  readCampaignPublicationDetailFromRuntime,
} from "@/lib/storefront/campaign-publication-source.server"

type Props = PublicPageProps<CampaignPublicationPageValue>

export const getServerSideProps = (async (context) =>
  resolveEntityPublicPage<CampaignPublicationPageValue>(context, {
    description: (campaign) => campaign.description,
    expectedRouteKey: "campaign.detail",
    isIndexable: (campaign) => campaign.indexable,
    kind: "campaign",
    loadSource: readCampaignPublicationDetailFromRuntime,
    queryKind: "campaign-detail",
    title: (campaign) => campaign.title,
  })) satisfies GetServerSideProps<Props>

export default function CampaignPage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="content" />
  }
  return (
    <CmsPageSurface
      page={{
        content: page.value.content,
        id: page.value.id,
        meta: {
          description: page.value.description,
          title: page.value.title,
        },
        publishedDate: page.value.publishedAt,
        slug: page.value.publicSlug,
        title: page.value.title,
      }}
    />
  )
}

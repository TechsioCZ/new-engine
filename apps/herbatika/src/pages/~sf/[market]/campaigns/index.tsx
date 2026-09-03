import type { GetServerSideProps } from "next"
import {
  type EntityIndexItem,
  EntityIndexPage,
} from "@/components/entity-index-page"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
import {
  foundSource,
  type PublicPageProps,
  resolveStaticPublicPage,
} from "@/lib/routing/public-page"
import { readCampaignPublicationIndexFromRuntime } from "@/lib/storefront/campaign-publication-source.server"
import { buildPath } from "@/lib/url/public-url"

type Props = PublicPageProps<
  Readonly<{ items: readonly EntityIndexItem[]; title: string }>
>

const TITLE = {
  sk: "Akcie",
  cz: "Akce",
  hu: "Akciók",
  ro: "Promoții",
} as const

export const getServerSideProps = (async (context) =>
  resolveStaticPublicPage(context, {
    expectedRouteKey: "campaign.index",
    isIndexable: (value) => value.items.length > 0,
    loadSource: async (market) => {
      const source = await readCampaignPublicationIndexFromRuntime(market)
      return source.kind === "found"
        ? foundSource({
            items: source.value.map((campaign) => ({
              href: buildPath(
                { kind: "campaign", slug: campaign.publicSlug },
                market
              ),
              id: campaign.id,
              label: campaign.title,
            })),
            title: TITLE[market],
          })
        : source
    },
    path: { kind: "campaign" },
    queryKind: "campaign-index",
    title: (value) => value.title,
  })) satisfies GetServerSideProps<Props>

export default function CampaignsPage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="content" />
  }
  return <EntityIndexPage {...page.value} />
}

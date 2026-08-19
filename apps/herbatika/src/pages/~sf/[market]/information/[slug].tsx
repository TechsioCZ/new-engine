import type { GetServerSideProps } from "next"
import { CmsPageSurface } from "@/components/cms/cms-page-surface"
import {
  type PublicPageProps,
  resolveEntityPublicPage,
} from "@/lib/routing/public-page"
import { type CmsPage, fetchCmsPageById } from "@/lib/storefront/cms"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"

type Props = PublicPageProps<CmsPage>

export const getServerSideProps = (async (context) =>
  resolveEntityPublicPage<CmsPage>(context, {
    expectedRouteKey: "page.detail",
    kind: "page",
    loadSource: async ({ market, sourceId }) => {
      const page = await fetchCmsPageById(
        sourceId,
        getHerbatikaMarketContext(market).locale
      )
      return page
        ? ({ kind: "found", value: page } as const)
        : ({ kind: "missing" } as const)
    },
    queryKind: "information-detail",
    title: (page) => page.meta?.title ?? page.title ?? "Herbatica",
  })) satisfies GetServerSideProps<Props>

export default function InformationPage({ page }: Props) {
  if (page.kind === "error") {
    return <main data-status={page.status}>Content unavailable.</main>
  }
  return <CmsPageSurface page={page.value} />
}

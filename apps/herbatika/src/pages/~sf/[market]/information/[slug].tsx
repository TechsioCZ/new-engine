import type { GetServerSideProps } from "next"
import { CmsPageSurface } from "@/components/cms/cms-page-surface"
import {
  type EntityPageProps,
  resolveEntityPage,
} from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"
import type { CmsPage } from "@/lib/storefront/cms"
import { fetchCmsPageById } from "@/lib/storefront/cms"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"

type Props = EntityPageProps<CmsPage>
export const getServerSideProps: GetServerSideProps<Props> = (context) =>
  resolveEntityPage<CmsPage>(context, "page", async ({ entityId, market }) => {
    const locale = getHerbatikaMarketContext(market).locale
    const page = await fetchCmsPageById(entityId, locale)
    return page ? { type: "found", value: page } : { type: "not-found" }
  })
export default function InformationPage({ source, status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  return source ? <CmsPageSurface page={source} /> : null
}

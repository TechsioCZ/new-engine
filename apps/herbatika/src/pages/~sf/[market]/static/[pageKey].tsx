import type { GetServerSideProps } from "next"
import { AboutPage } from "@/components/about/about-page"
import { CmsPageSurface } from "@/components/cms/cms-page-surface"
import { FaqPage } from "@/components/faq/faq-page"
import {
  type PublicPageProps,
  resolveStaticPublicPage,
} from "@/lib/routing/public-page"
import { type CmsPage, readCmsStaticPage } from "@/lib/storefront/cms"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"
import { STATIC_ROOT_PAGE_KEYS } from "@/lib/url/segments"
import type { StaticRootPageKey } from "@/lib/url/types"

type StaticValue =
  | Readonly<{ kind: "about" }>
  | Readonly<{ kind: "faq" }>
  | Readonly<{ kind: "cms"; page: CmsPage }>

type Props = PublicPageProps<StaticValue>

const isStaticPageKey = (value: unknown): value is StaticRootPageKey =>
  typeof value === "string" &&
  (STATIC_ROOT_PAGE_KEYS as readonly string[]).includes(value)

export const getServerSideProps = ((context) => {
  const pageKey = context.params?.pageKey
  if (!isStaticPageKey(pageKey)) {
    return Promise.resolve({ notFound: true as const })
  }
  return resolveStaticPublicPage<StaticValue>(context, {
    expectedRouteKey: `static.${pageKey}`,
    loadSource: async (market) => {
      if (pageKey === "about" || pageKey === "faq") {
        return { kind: "found", value: { kind: pageKey } } as const
      }
      const result = await readCmsStaticPage(
        pageKey,
        getHerbatikaMarketContext(market).locale
      )
      return result.kind === "found"
        ? ({
            kind: "found",
            value: { kind: "cms", page: result.value },
          } as const)
        : result
    },
    path: { kind: "static", page: pageKey },
    queryKind: "static-page",
  })
}) satisfies GetServerSideProps<Props>

export default function StaticPage({ page, reviewTrustSources }: Props) {
  if (page.kind === "error") {
    return <main data-status={page.status}>Content unavailable.</main>
  }
  if (page.value.kind === "about") {
    return <AboutPage reviewTrustSources={reviewTrustSources} />
  }
  if (page.value.kind === "faq") {
    return <FaqPage />
  }
  return <CmsPageSurface page={page.value.page} />
}

import type { GetServerSideProps } from "next"
import { AboutPage } from "@/components/about/about-page"
import { getAboutPageData } from "@/components/about/about-page.data"
import { CmsPageSurface } from "@/components/cms/cms-page-surface"
import { FaqPage } from "@/components/faq/faq-page"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
import {
  type PublicPageProps,
  resolveStaticPublicPage,
} from "@/lib/routing/public-page"
import {
  type CmsPage,
  readCmsStaticPageWithDemoFallback,
} from "@/lib/storefront/cms"
import {
  getHerbatikaMarketContext,
  type HerbatikaLocale,
} from "@/lib/storefront/market-context"
import { isRoDemoStaticPage } from "@/lib/storefront/ro-demo-static-pages"
import { STATIC_ROOT_PAGE_KEYS } from "@/lib/url/segments"
import type { StaticRootPageKey } from "@/lib/url/types"

type StaticValue =
  | Readonly<{ kind: "about"; locale: HerbatikaLocale }>
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
      if (pageKey === "about") {
        const locale = getHerbatikaMarketContext(market).locale
        if (!getAboutPageData(locale)) {
          return {
            causeCode: "UNSUPPORTED_ABOUT_PAGE_LOCALE",
            kind: "invalid-response",
          } as const
        }
        return { kind: "found", value: { kind: pageKey, locale } } as const
      }
      if (pageKey === "faq") {
        return { kind: "found", value: { kind: pageKey } } as const
      }
      const result = await readCmsStaticPageWithDemoFallback(
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
    isIndexable: (value) =>
      value.kind !== "cms" || !isRoDemoStaticPage(value.page),
    title: (value) =>
      value.kind === "cms"
        ? (value.page.meta?.title ?? value.page.title ?? "Herbatica")
        : "Herbatica",
  })
}) satisfies GetServerSideProps<Props>

export default function StaticPage({ page, reviewTrustSources }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="content" />
  }
  if (page.value.kind === "about") {
    return (
      <AboutPage
        locale={page.value.locale}
        reviewTrustSources={reviewTrustSources}
      />
    )
  }
  if (page.value.kind === "faq") {
    return <FaqPage />
  }
  return <CmsPageSurface page={page.value.page} />
}

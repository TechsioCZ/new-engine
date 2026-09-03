import type { GetServerSideProps } from "next"
import { CmsPageSurface } from "@/components/cms/cms-page-surface"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
import {
  type PublicPageProps,
  resolveStaticPublicPage,
} from "@/lib/routing/public-page"
import {
  type CmsPage,
  readCmsStaticPageWithDemoFallback,
} from "@/lib/storefront/cms"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"
import { isRoDemoStaticPage } from "@/lib/storefront/ro-demo-static-pages"
import type { StaticRoutePublicationDecision } from "@/lib/url/segment-registry-publication"
import { assertReviewedStaticRouteSource } from "@/lib/url/segment-registry-publication/reviewed-source.server"
import { loadStaticRoutePublicationDecision } from "@/lib/url/segment-registry-publication.server"
import { STATIC_ROOT_PAGE_KEYS } from "@/lib/url/segments"
import type { Market, StaticRootPageKey } from "@/lib/url/types"

type StaticValue = Readonly<{
  kind: "cms"
  page: CmsPage
  publicationApproved: boolean
}>

type Props = PublicPageProps<StaticValue>

const isStaticPageKey = (value: unknown): value is StaticRootPageKey =>
  typeof value === "string" &&
  (STATIC_ROOT_PAGE_KEYS as readonly string[]).includes(value)

const invalidStaticSource = (causeCode: string) =>
  ({ causeCode, kind: "invalid-response" }) as const

const isReviewedSource = async (
  market: Market,
  pageKey: StaticRootPageKey,
  publication: StaticRoutePublicationDecision,
  renderedSource: unknown
): Promise<boolean> => {
  if (publication.kind !== "approved") {
    return true
  }
  try {
    await assertReviewedStaticRouteSource({
      market,
      pageKey,
      publication,
      renderedSource,
    })
    return true
  } catch {
    return false
  }
}

const loadCmsSource = async (
  market: Market,
  pageKey: StaticRootPageKey,
  publication: StaticRoutePublicationDecision
) => {
  const result = await readCmsStaticPageWithDemoFallback(
    pageKey,
    getHerbatikaMarketContext(market).locale
  )
  if (result.kind !== "found") {
    return result
  }
  const demoSource = isRoDemoStaticPage(result.value)
  if (
    !(
      demoSource ||
      (await isReviewedSource(market, pageKey, publication, result.value))
    )
  ) {
    return invalidStaticSource("STATIC_CONTENT_REVIEW_BINDING_FAILED")
  }
  return {
    kind: "found",
    value: {
      kind: "cms",
      page: result.value,
      publicationApproved: publication.kind === "approved" && !demoSource,
    },
  } as const
}

const loadStaticSource = async (market: Market, pageKey: StaticRootPageKey) => {
  const publication = await loadStaticRoutePublicationDecision({
    market,
    routeKey: pageKey,
  })
  if (publication.kind === "rejected") {
    return { kind: "unavailable", retryAfterSeconds: 30 } as const
  }
  return loadCmsSource(market, pageKey, publication)
}

export const getServerSideProps = ((context) => {
  const pageKey = context.params?.pageKey
  if (!isStaticPageKey(pageKey)) {
    return Promise.resolve({ notFound: true as const })
  }
  return resolveStaticPublicPage<StaticValue>(context, {
    expectedRouteKey: `static.${pageKey}`,
    loadSource: (market) => loadStaticSource(market, pageKey),
    path: { kind: "static", page: pageKey },
    queryKind: "static-page",
    isIndexable: (value) =>
      value.publicationApproved && !isRoDemoStaticPage(value.page),
    title: (value) => value.page.meta?.title ?? value.page.title ?? undefined,
    useLinkFreeShellWhenNoindex: true,
  })
}) satisfies GetServerSideProps<Props>

export default function StaticPage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="content" />
  }
  return <CmsPageSurface page={page.value.page} />
}

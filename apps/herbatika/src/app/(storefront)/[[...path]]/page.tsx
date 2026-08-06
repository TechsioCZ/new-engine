import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound, permanentRedirect } from "next/navigation"
import { cache } from "react"
import { renderContentRoute } from "@/lib/routing/app/content-renderer"
import { renderFlowRoute } from "@/lib/routing/app/flow-renderer"
import {
  type ResolvedStorefrontRoute,
  resolveStorefrontRoute,
} from "@/lib/routing/app/resolver"
import { CANONICALIZATION_REQUIRED_HEADER } from "@/lib/routing/trusted-headers"
import { resolveAllowedMarkets } from "@/lib/seo/market"
import {
  buildEntityPageMetadata,
  buildIndexPageMetadata,
  buildNoindexMetadata,
} from "@/lib/seo/metadata"
import { getMarketServerContext } from "@/lib/storefront/market-context.app"
import { buildCanonical, getMarketOrigin } from "@/lib/url/builder"
import { MARKETS, type Market } from "@/lib/url/types"

type SearchParams = Record<string, string | string[] | undefined>
type PageProps = {
  params: Promise<{ path?: string[] }>
  searchParams: Promise<SearchParams>
}

const HREF_LANG: Record<Market, string> = {
  sk: "sk-SK",
  cz: "cs-CZ",
  hu: "hu-HU",
  ro: "ro-RO",
}

const resolveRequestRoute = cache(
  async (rawPath: readonly string[] | undefined) => {
    const [marketContext, headerStore] = await Promise.all([
      getMarketServerContext(),
      headers(),
    ])
    const needsCanonicalization =
      headerStore.get(CANONICALIZATION_REQUIRED_HEADER) === "1"
    const path = needsCanonicalization
      ? (rawPath ?? []).map((segment, index) =>
          index < 2 ? segment.toLowerCase() : segment
        )
      : rawPath
    const route = await resolveStorefrontRoute(marketContext.code, path)
    return { market: marketContext.code, needsCanonicalization, route }
  }
)

const pageNumber = (searchParams: SearchParams): number | undefined => {
  const value = searchParams.strana
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(raw ?? "", 10)
  return Number.isInteger(parsed) && parsed >= 2 ? parsed : undefined
}

const homeMetadata = (market: Market): Metadata => ({
  alternates: {
    canonical: getMarketOrigin(market),
    languages: Object.fromEntries([
      ...MARKETS.filter((candidate) =>
        resolveAllowedMarkets().has(candidate)
      ).map((candidate) => [HREF_LANG[candidate], getMarketOrigin(candidate)]),
    ]),
  },
  openGraph: { url: getMarketOrigin(market) },
  robots: "index, follow",
})

const metadataFor = (
  market: Market,
  route: ResolvedStorefrontRoute,
  searchParams: SearchParams
): Metadata => {
  if (route.type === "home") {
    return homeMetadata(market)
  }
  if (route.type === "index") {
    return buildIndexPageMetadata({
      market,
      kind: route.kind,
      page: pageNumber(searchParams),
      query: searchParams,
    })
  }
  if (route.type === "entity" && route.resolution.type === "current") {
    return buildEntityPageMetadata({
      market,
      kind: route.kind,
      record: route.resolution.record,
      alternates: route.resolution.alternates,
      query: searchParams,
    })
  }
  return buildNoindexMetadata({ market })
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const [{ path }, query] = await Promise.all([params, searchParams])
  const { market, route } = await resolveRequestRoute(path)
  return metadataFor(market, route, query)
}

const redirectEntity = (
  market: Market,
  route: Extract<ResolvedStorefrontRoute, { type: "entity" }>,
  searchParams: SearchParams,
  needsCanonicalization: boolean
) => {
  if (route.resolution.type === "alias") {
    permanentRedirect(
      buildCanonical({
        market,
        kind: route.kind,
        slug: route.resolution.record.slug,
        searchParams,
      })
    )
  }
  if (route.resolution.type === "current" && needsCanonicalization) {
    permanentRedirect(
      buildCanonical({
        market,
        kind: route.kind,
        slug: route.resolution.record.slug,
        searchParams,
      })
    )
  }
}

export default async function StorefrontPage({
  params,
  searchParams,
}: PageProps) {
  const [{ path }, query] = await Promise.all([params, searchParams])
  const { market, needsCanonicalization, route } =
    await resolveRequestRoute(path)

  if (route.type === "not-found") {
    notFound()
  }
  if (route.type === "entity") {
    if (
      route.resolution.type === "missing" ||
      route.resolution.type === "tombstone"
    ) {
      notFound()
    }
    redirectEntity(market, route, query, needsCanonicalization)
  }

  const content =
    (await renderContentRoute({ market, route, searchParams: query })) ??
    (await renderFlowRoute({ market, route, searchParams: query }))
  if (content === null) {
    notFound()
  }
  return content
}

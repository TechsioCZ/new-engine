import { createHash } from "node:crypto"
import {
  ACCOUNT_CHILD_KEYS,
  CHECKOUT_CHILD_KEYS,
  FLOW_ROOT_KEYS,
  LEGAL_STATIC_ROOT_PAGE_KEYS,
  MARKETS,
  REVIEW_CHILD_KEYS,
  ROUTE_SEGMENT_REGISTRY,
  STATIC_ROOT_PAGE_KEYS,
  TYPE_PREFIX_KEYS,
} from "@/lib/url/segments"
import type {
  AccountChildKey,
  CheckoutChildKey,
  FlowRootKey,
  Market,
  ReviewChildKey,
  StaticRootPageKey,
} from "@/lib/url/types"
import type { StaticPathMatchMode, UrlIndexPolicy } from "../model"

export type PopulationStaticRoute = Readonly<{
  equivalenceKey: string
  indexPolicy: UrlIndexPolicy
  market: Market
  matchMode: StaticPathMatchMode
  parentRouteKey: string | null
  routeKey: string
  segment: string
}>

const PREFIX_FLOW_ROOTS = new Set<FlowRootKey>([
  "account",
  "checkout",
  "reviews",
])
const PREFIX_ACCOUNT_CHILDREN = new Set<AccountChildKey>([
  "orders",
  "resetPassword",
])
const PREFIX_CHECKOUT_CHILDREN = new Set<CheckoutChildKey>([
  "confirmation",
  "checkoutResult",
])
const PREFIX_REVIEW_CHILDREN = new Set<ReviewChildKey>(["product"])
// Static-root CMS pages ship demo content that has not passed the G1
// editorial/legal publication gate on any market, so they stay noindex
// (and therefore renderable) until reviewed artifacts exist.
const DEMO_NOINDEX_STATIC_ROOT_PAGE_KEYS = new Set<StaticRootPageKey>([
  "affiliate",
  "contact",
  "cookies",
  "dropshipping",
  "giftVoucher",
  "privacy",
  "privateLabel",
  "returns",
  "shipping",
  "terms",
  "wholesale",
])

const staticRoute = (
  market: Market,
  routeKey: string,
  segment: string,
  options: Readonly<{
    indexPolicy?: UrlIndexPolicy
    matchMode?: StaticPathMatchMode
    parentRouteKey?: string | null
  }> = {}
): PopulationStaticRoute => ({
  equivalenceKey: `static:${routeKey}`,
  indexPolicy: options.indexPolicy ?? "noindex",
  market,
  matchMode: options.matchMode ?? "exact",
  parentRouteKey: options.parentRouteKey ?? null,
  routeKey,
  segment,
})

const typeRoutes = (market: Market): PopulationStaticRoute[] => {
  const registry = ROUTE_SEGMENT_REGISTRY[market]
  return TYPE_PREFIX_KEYS.map((key) =>
    staticRoute(market, `type:${key}`, registry.typePrefixes[key], {
      indexPolicy: "indexable",
      matchMode: "prefix",
    })
  )
}

const flowRoutes = (market: Market): PopulationStaticRoute[] => {
  const registry = ROUTE_SEGMENT_REGISTRY[market]
  return FLOW_ROOT_KEYS.map((key) =>
    staticRoute(market, `flow:${key}`, registry.flowRoots[key], {
      matchMode: PREFIX_FLOW_ROOTS.has(key) ? "prefix" : "exact",
    })
  )
}

const rootRoutes = (market: Market): PopulationStaticRoute[] => {
  const registry = ROUTE_SEGMENT_REGISTRY[market]
  const staticRootPages: Readonly<Partial<Record<StaticRootPageKey, string>>> =
    registry.staticRootPages
  return STATIC_ROOT_PAGE_KEYS.flatMap((key) => {
    const segment = staticRootPages[key]
    return segment
      ? [
          staticRoute(market, `root:${key}`, segment, {
            indexPolicy: DEMO_NOINDEX_STATIC_ROOT_PAGE_KEYS.has(key)
              ? "noindex"
              : "indexable",
          }),
        ]
      : []
  })
}

const checkoutRoutes = (market: Market): PopulationStaticRoute[] => {
  const registry = ROUTE_SEGMENT_REGISTRY[market]
  return CHECKOUT_CHILD_KEYS.map((key) =>
    staticRoute(
      market,
      `flow:checkout:${key}`,
      registry.children.checkout[key],
      {
        matchMode: PREFIX_CHECKOUT_CHILDREN.has(key) ? "prefix" : "exact",
        parentRouteKey: "flow:checkout",
      }
    )
  )
}

const accountRoutes = (market: Market): PopulationStaticRoute[] => {
  const registry = ROUTE_SEGMENT_REGISTRY[market]
  return ACCOUNT_CHILD_KEYS.map((key) =>
    staticRoute(market, `flow:account:${key}`, registry.children.account[key], {
      matchMode: PREFIX_ACCOUNT_CHILDREN.has(key) ? "prefix" : "exact",
      parentRouteKey: "flow:account",
    })
  )
}

const reviewRoutes = (market: Market): PopulationStaticRoute[] => {
  const registry = ROUTE_SEGMENT_REGISTRY[market]
  return REVIEW_CHILD_KEYS.map((key) =>
    staticRoute(market, `flow:reviews:${key}`, registry.children.reviews[key], {
      matchMode: PREFIX_REVIEW_CHILDREN.has(key) ? "prefix" : "exact",
      parentRouteKey: "flow:reviews",
    })
  )
}

const marketStaticRoutes = (market: Market): PopulationStaticRoute[] => [
  ...typeRoutes(market),
  ...flowRoutes(market),
  ...rootRoutes(market),
  ...checkoutRoutes(market),
  ...accountRoutes(market),
  ...reviewRoutes(market),
]

export const buildPopulationStaticTaxonomy =
  (): readonly PopulationStaticRoute[] => MARKETS.flatMap(marketStaticRoutes)

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }
  if (value === null || typeof value !== "object") {
    return value
  }
  const record = value as Readonly<Record<string, unknown>>
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, canonicalize(record[key])])
  )
}

export const hashPopulationStaticTaxonomy = (
  routes: readonly PopulationStaticRoute[] = buildPopulationStaticTaxonomy()
): `sha256:${string}` => {
  const ordered = [...routes].sort((left, right) =>
    `${left.market}:${left.routeKey}`.localeCompare(
      `${right.market}:${right.routeKey}`
    )
  )
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(ordered)))
    .digest("hex")}`
}

export const staticRoutePath = (
  route: PopulationStaticRoute,
  routes: readonly PopulationStaticRoute[]
): string => {
  const byKey = new Map(
    routes
      .filter(({ market }) => market === route.market)
      .map((candidate) => [candidate.routeKey, candidate])
  )
  const segments = [route.segment]
  const seen = new Set([route.routeKey])
  let parentKey = route.parentRouteKey
  while (parentKey) {
    if (seen.has(parentKey)) {
      throw new Error(
        `Static route parent cycle at ${route.market}:${parentKey}`
      )
    }
    seen.add(parentKey)
    const parent = byKey.get(parentKey)
    if (!parent) {
      throw new Error(
        `Missing static parent ${route.market}:${parentKey} for ${route.routeKey}`
      )
    }
    segments.unshift(parent.segment)
    parentKey = parent.parentRouteKey
  }
  return `/${segments.join("/")}`
}

export const isLegalStaticRoute = (routeKey: string): boolean =>
  LEGAL_STATIC_ROOT_PAGE_KEYS.some(
    (key: StaticRootPageKey) => routeKey === `root:${key}`
  )

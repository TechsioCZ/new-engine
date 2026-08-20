import { ROUTE_SEGMENT_REGISTRY } from "./segment-registry-data"
import {
  ACCOUNT_CHILD_KEYS,
  CHECKOUT_CHILD_KEYS,
  FLOW_ROOT_KEYS,
  MARKETS,
  REVIEW_CHILD_KEYS,
  STATIC_ROOT_PAGE_KEYS,
  TYPE_PREFIX_KEYS,
} from "./segment-registry-keys"
import type {
  AccountChildKey,
  CheckoutChildKey,
  FlowRootKey,
  Market,
  ReviewChildKey,
  RootSegmentMatch,
  StaticRootPageKey,
  TypePrefixKey,
} from "./types"

const parseSiblingSegment = <Key extends string>(
  keys: readonly Key[],
  siblings: Readonly<Partial<Record<Key, string>>>,
  segment: string
): Key | null => keys.find((key) => siblings[key] === segment) ?? null

export const parseMarket = (value: string): Market | null =>
  MARKETS.find((market) => market === value) ?? null

export const parseTypePrefixSegment = (
  market: Market,
  segment: string
): TypePrefixKey | null =>
  parseSiblingSegment(
    TYPE_PREFIX_KEYS,
    ROUTE_SEGMENT_REGISTRY[market].typePrefixes,
    segment
  )

export const parseFlowRootSegment = (
  market: Market,
  segment: string
): FlowRootKey | null =>
  parseSiblingSegment(
    FLOW_ROOT_KEYS,
    ROUTE_SEGMENT_REGISTRY[market].flowRoots,
    segment
  )

export const parseStaticRootPageSegment = (
  market: Market,
  segment: string
): StaticRootPageKey | null =>
  parseSiblingSegment(
    STATIC_ROOT_PAGE_KEYS,
    ROUTE_SEGMENT_REGISTRY[market].staticRootPages,
    segment
  )

export const parseRootSegment = (
  market: Market,
  segment: string
): RootSegmentMatch | null => {
  const typePrefix = parseTypePrefixSegment(market, segment)
  if (typePrefix !== null) {
    return { group: "type-prefix", key: typePrefix }
  }

  const flowRoot = parseFlowRootSegment(market, segment)
  if (flowRoot !== null) {
    return { group: "flow-root", key: flowRoot }
  }

  const staticRootPage = parseStaticRootPageSegment(market, segment)
  if (staticRootPage !== null) {
    return { group: "static-root-page", key: staticRootPage }
  }

  return null
}

export const parseCheckoutChildSegment = (
  market: Market,
  segment: string
): CheckoutChildKey | null =>
  parseSiblingSegment(
    CHECKOUT_CHILD_KEYS,
    ROUTE_SEGMENT_REGISTRY[market].children.checkout,
    segment
  )

export const parseAccountChildSegment = (
  market: Market,
  segment: string
): AccountChildKey | null =>
  parseSiblingSegment(
    ACCOUNT_CHILD_KEYS,
    ROUTE_SEGMENT_REGISTRY[market].children.account,
    segment
  )

export const parseReviewChildSegment = (
  market: Market,
  segment: string
): ReviewChildKey | null =>
  parseSiblingSegment(
    REVIEW_CHILD_KEYS,
    ROUTE_SEGMENT_REGISTRY[market].children.reviews,
    segment
  )

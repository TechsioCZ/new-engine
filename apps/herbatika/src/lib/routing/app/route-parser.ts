import type { RouteSearchParams } from "@/lib/routing/query-validation"
import {
  getSegment,
  ROUTABLE_SEGMENT_KEYS,
  resolveKindFromSegment,
  type SegmentKey,
} from "@/lib/url/segments"
import type { Market, UrlKind } from "@/lib/url/types"

export type EntityIndexKind = Exclude<UrlKind, "page">
export type AccountAction = "login" | "register" | "forgot" | "reset"
export type AccountSection = "orders" | "lists" | "settings"
export type CheckoutRoute =
  | "root"
  | "contact"
  | "shipping"
  | "payment"
  | "review"
  | "payment-return"
  | "confirmation"

export type ParsedPublicRoute =
  | { type: "home" }
  | { type: "index"; kind: EntityIndexKind }
  | { type: "entity"; kind: UrlKind; slug: string }
  | { type: "search" }
  | { type: "cart" }
  | { type: "checkout"; route: CheckoutRoute }
  | {
      type: "account"
      section?: AccountSection
      orderId?: string
      action?: AccountAction
      token?: string
    }
  | { type: "review"; token: string }
  | { type: "not-found" }

/** Compatibility name used by the App route resolver and renderers. */
export type ParsedStorefrontRoute = ParsedPublicRoute

export type ParsePublicRouteInput = {
  market: Market
  pathnameSegments?: readonly string[]
  /** Query validation is deliberately a separate routing concern. */
  searchParams?: URLSearchParams | RouteSearchParams
}

const CANONICAL_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const hasInvalidOpaqueCharacter = (value: string): boolean => {
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code <= 31 || code === 127 || character === "/" || character === "\\") {
      return true
    }
  }
  return false
}

const notFound = (): ParsedPublicRoute => ({ type: "not-found" })

const equalsSegment = (
  market: Market,
  value: string,
  key: SegmentKey
): boolean => value === getSegment(market, key)

const isOpaqueSegment = (value: string | undefined): value is string =>
  Boolean(
    value &&
      value !== "." &&
      value !== ".." &&
      !hasInvalidOpaqueCharacter(value)
  )

const parseCheckout = (
  market: Market,
  rest: readonly string[]
): ParsedPublicRoute => {
  if (rest.length === 0) {
    return { type: "checkout", route: "root" }
  }
  if (rest.length !== 1) {
    return notFound()
  }

  const routes = [
    ["checkout.contact", "contact"],
    ["checkout.shipping", "shipping"],
    ["checkout.payment", "payment"],
    ["checkout.review", "review"],
    ["checkout.paymentReturn", "payment-return"],
    ["checkout.confirmation", "confirmation"],
  ] as const
  const route = routes.find(([key]) =>
    equalsSegment(market, rest[0] ?? "", key)
  )?.[1]
  return route ? { type: "checkout", route } : notFound()
}

const parseAccount = (
  market: Market,
  rest: readonly string[]
): ParsedPublicRoute => {
  if (rest.length === 0) {
    return { type: "account" }
  }

  const first = rest[0] ?? ""
  if (equalsSegment(market, first, "account.orders")) {
    if (rest.length === 1) {
      return { type: "account", section: "orders" }
    }
    return rest.length === 2 && isOpaqueSegment(rest[1])
      ? { type: "account", orderId: rest[1] }
      : notFound()
  }

  if (rest.length === 1) {
    const sections = [
      ["account.lists", "lists"],
      ["account.settings", "settings"],
    ] as const
    const section = sections.find(([key]) =>
      equalsSegment(market, first, key)
    )?.[1]
    if (section) {
      return { type: "account", section }
    }
  }

  const actions = [
    ["account.login", "login"],
    ["account.register", "register"],
    ["account.forgotPassword", "forgot"],
    ["account.resetPassword", "reset"],
  ] as const
  const action = actions.find(([key]) => equalsSegment(market, first, key))?.[1]
  if (!action) {
    return notFound()
  }
  if (rest.length === 1) {
    return { type: "account", action }
  }
  return action === "reset" && rest.length === 2 && isOpaqueSegment(rest[1])
    ? { type: "account", action, token: rest[1] }
    : notFound()
}

const parseContentRoute = (
  kind: UrlKind,
  rest: readonly string[]
): ParsedPublicRoute => {
  if (rest.length === 0) {
    return kind === "page" ? notFound() : { type: "index", kind }
  }
  return rest.length === 1 && CANONICAL_SEGMENT_PATTERN.test(rest[0] ?? "")
    ? { type: "entity", kind, slug: rest[0] ?? "" }
    : notFound()
}

const parseResolvedKind = (
  market: Market,
  kind: ReturnType<typeof resolveKindFromSegment> & string,
  rest: readonly string[]
): ParsedPublicRoute => {
  switch (kind) {
    case "search":
      return rest.length === 0 ? { type: "search" } : notFound()
    case "cart":
      return rest.length === 0 ? { type: "cart" } : notFound()
    case "checkout":
      return parseCheckout(market, rest)
    case "account":
      return parseAccount(market, rest)
    case "reviews":
      return rest.length === 2 &&
        equalsSegment(market, rest[0] ?? "", "reviews.product") &&
        isOpaqueSegment(rest[1])
        ? { type: "review", token: rest[1] }
        : notFound()
    default:
      return parseContentRoute(kind, rest)
  }
}

export function parsePublicRoute({
  market,
  pathnameSegments = [],
  searchParams: _searchParams,
}: ParsePublicRouteInput): ParsedPublicRoute {
  if (pathnameSegments.length === 0) {
    return { type: "home" }
  }

  const first = pathnameSegments[0] ?? ""
  if (!CANONICAL_SEGMENT_PATTERN.test(first)) {
    return notFound()
  }
  const kind = resolveKindFromSegment(market, first)
  if (!kind || first !== getSegment(market, ROUTABLE_SEGMENT_KEYS[kind])) {
    return notFound()
  }
  return parseResolvedKind(market, kind, pathnameSegments.slice(1))
}

export function parseStorefrontPath(
  market: Market,
  path: readonly string[] | undefined
): ParsedStorefrontRoute {
  return parsePublicRoute({ market, pathnameSegments: path })
}

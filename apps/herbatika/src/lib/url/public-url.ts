// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: The exhaustive typed switch is the single builder for every public route family.
import { ROUTES } from "@/lib/market/market-runtime-definitions"
import type { EntityUrlKind } from "@/lib/url-registry/model"
import { ROUTE_SEGMENT_REGISTRY } from "./segments"
import { validatePublishedSlug } from "./slug"
import type {
  AccountChildKey,
  CheckoutChildKey,
  Market,
  StaticRootPageKey,
} from "./types"

export type EntityRouteTarget = Readonly<{
  kind: EntityUrlKind
  slug?: string
}>

export type PublicRouteTarget =
  | Readonly<{ kind: "home" }>
  | EntityRouteTarget
  | Readonly<{ kind: "static"; page: StaticRootPageKey }>
  | Readonly<{
      kind: "staticSnapshot"
      segments: readonly [string, ...string[]]
    }>
  | Readonly<{ kind: "search"; query?: string }>
  | Readonly<{ kind: "cart" }>
  | Readonly<{
      kind: "checkout"
      step?: CheckoutChildKey
      value?: string
    }>
  | Readonly<{
      kind: "account"
      section?: AccountChildKey
      value?: string
    }>
  | Readonly<{ kind: "review"; token: string }>

const ENTITY_PREFIX = {
  product: "products",
  category: "categories",
  brand: "brands",
  collection: "collections",
  campaign: "campaigns",
  article: "advice",
  page: "information",
} as const satisfies Record<
  EntityUrlKind,
  keyof (typeof ROUTE_SEGMENT_REGISTRY)[Market]["typePrefixes"]
>

const encodeOpaqueSegment = (value: string, name: string) => {
  if (!value || value === "." || value === "..") {
    throw new Error(`${name} must be a non-empty path segment`)
  }
  return encodeURIComponent(value)
}

const STATIC_SNAPSHOT_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const staticSnapshotPath = (segments: readonly string[]) => {
  if (segments.length === 0 || segments.length > 16) {
    throw new Error("A static snapshot path requires 1 to 16 segments")
  }
  for (const segment of segments) {
    if (segment.length > 80 || !STATIC_SNAPSHOT_SEGMENT.test(segment)) {
      throw new Error("Static snapshot paths require normalized ASCII segments")
    }
  }
  return `/${segments.join("/")}`
}

export const buildPath = (
  target: PublicRouteTarget,
  market: Market
): string => {
  const segments = ROUTE_SEGMENT_REGISTRY[market]

  switch (target.kind) {
    case "home":
      return "/"
    case "product":
    case "category":
    case "brand":
    case "collection":
    case "campaign":
    case "article":
    case "page": {
      const root = segments.typePrefixes[ENTITY_PREFIX[target.kind]]
      if (target.slug === undefined) {
        if (target.kind === "page") {
          throw new Error("Information pages require a published slug")
        }
        return `/${root}`
      }
      return `/${root}/${validatePublishedSlug(target.slug)}`
    }
    case "static":
      return `/${segments.staticRootPages[target.page]}`
    case "staticSnapshot":
      return staticSnapshotPath(target.segments)
    case "search": {
      const root = `/${segments.flowRoots.search}`
      const query = target.query?.trim()
      return query ? `${root}?${new URLSearchParams({ q: query })}` : root
    }
    case "cart":
      return `/${segments.flowRoots.cart}`
    case "checkout": {
      const root = `/${segments.flowRoots.checkout}`
      if (!target.step) {
        if (target.value !== undefined) {
          throw new Error("A checkout value requires a checkout step")
        }
        return root
      }
      const step = `${root}/${segments.children.checkout[target.step]}`
      return target.value === undefined
        ? step
        : `${step}/${encodeOpaqueSegment(target.value, "Checkout value")}`
    }
    case "account": {
      const root = `/${segments.flowRoots.account}`
      if (!target.section) {
        if (target.value !== undefined) {
          throw new Error("An account value requires an account section")
        }
        return root
      }
      const section = `${root}/${segments.children.account[target.section]}`
      return target.value === undefined
        ? section
        : `${section}/${encodeOpaqueSegment(target.value, "Account value")}`
    }
    case "review":
      return `/${segments.flowRoots.reviews}/${segments.children.reviews.product}/${encodeOpaqueSegment(target.token, "Review token")}`
    default:
      throw new Error(`Unsupported public route: ${target satisfies never}`)
  }
}

export const buildAbsoluteUrl = (
  target: PublicRouteTarget,
  market: Market
): URL => new URL(buildPath(target, market), ROUTES[market].canonicalOrigin)

export const resolveNavigationMode = (_target: PublicRouteTarget): "document" =>
  "document"

export const withPublicSearchParams = (
  pathname: string,
  values: Readonly<Record<string, string | number | null | undefined>>
): string => {
  const url = new URL(pathname, "https://internal.invalid")
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") {
      url.searchParams.delete(key)
    } else {
      url.searchParams.set(key, String(value))
    }
  }
  return `${url.pathname}${url.search}`
}

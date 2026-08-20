import { createHash } from "node:crypto"
import type { CatalogLifecycleDeliveryV1 } from "./catalog-lifecycle-parser"
import type { EntityRouteSnapshot, SourceReadResult } from "./contracts"
import type {
  ProductLifecycleChangeType,
  ProductLifecycleDeliveryV1,
} from "./product-lifecycle-parser"

export type UrlRegistryLifecycleDeliveryV1 =
  | ProductLifecycleDeliveryV1
  | CatalogLifecycleDeliveryV1

type AppliedAction =
  | "noop-source-present"
  | "noop-source-missing"
  | "noop-route-missing"
  | "noop-route-terminal"
  | "noop-unpublished"
  | "requires-publication"
  | "unpublished"
export type ProductLifecycleReceiptAction =
  | AppliedAction
  | "published"
  | "retired"
  | "slug-changed"
export type ProductLifecycleDecision =
  | Readonly<{ kind: "apply"; action: AppliedAction }>
  | Readonly<{
      kind: "publish"
      action: "published"
      publicSlug: string
    }>
  | Readonly<{
      kind: "change-slug"
      action: "slug-changed"
      publicSlug: string
      route: EntityRouteSnapshot
    }>
  | Readonly<{
      kind: "retire"
      action: "retired" | "unpublished"
      route: EntityRouteSnapshot
    }>
  | Readonly<{
      kind: "retry"
      action: null
      cause:
        | "source-unavailable"
        | "source-invalid-response"
        | "route-unavailable"
        | "route-invalid-response"
    }>
  | Readonly<{
      kind: "conflict"
      action: null
      cause: "live-source-has-terminal-route"
    }>

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }
  if (!(value && typeof value === "object")) {
    return value
  }
  const record = value as Readonly<Record<string, unknown>>
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => [key, canonicalize(record[key])])
  )
}

export const fingerprintProductLifecycleDelivery = (
  delivery: UrlRegistryLifecycleDeliveryV1
): `sha256:${string}` =>
  `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(delivery)))
    .digest("hex")}`

export const productLifecycleSourceEventId = (
  delivery: UrlRegistryLifecycleDeliveryV1
): string => delivery.outboxEventId

type ProductAssignment = UrlRegistryLifecycleDeliveryV1["payload"]["assignment"]
type ProductSource = SourceReadResult<unknown>
type ProductRoute = SourceReadResult<EntityRouteSnapshot>

const retryForSource = (
  source: ProductSource
): Extract<ProductLifecycleDecision, { kind: "retry" }> | null =>
  source.kind === "unavailable" || source.kind === "invalid-response"
    ? {
        kind: "retry",
        action: null,
        cause: `source-${source.kind}`,
      }
    : null

const unpublishedDecision = (
  route: Extract<ProductRoute, { kind: "found" | "missing" }>,
  retireActiveRoute: boolean
): ProductLifecycleDecision => {
  if (!(route.kind === "found" && route.value.route.status === "active")) {
    return { kind: "apply", action: "noop-unpublished" }
  }
  return retireActiveRoute
    ? { kind: "retire", action: "unpublished", route: route.value }
    : { kind: "apply", action: "unpublished" }
}

const decideReconcile = (
  assignment: ProductAssignment,
  source: ProductSource,
  route: Extract<ProductRoute, { kind: "found" | "missing" }>,
  retireActiveRouteWhenUnpublished: boolean
): ProductLifecycleDecision => {
  if (assignment?.publicationStatus !== "published") {
    return unpublishedDecision(route, retireActiveRouteWhenUnpublished)
  }
  const retry = retryForSource(source)
  if (retry) {
    return retry
  }
  if (source.kind === "missing") {
    return unpublishedDecision(route, retireActiveRouteWhenUnpublished)
  }
  if (route.kind === "missing") {
    return {
      kind: "publish",
      action: "published",
      publicSlug: assignment.publicSlug,
    }
  }
  if (route.value.route.status !== "active") {
    return {
      kind: "conflict",
      action: null,
      cause: "live-source-has-terminal-route",
    }
  }
  return route.value.currentSlug.normalizedSlug === assignment.publicSlug
    ? { kind: "apply", action: "noop-source-present" }
    : {
        kind: "change-slug",
        action: "slug-changed",
        publicSlug: assignment.publicSlug,
        route: route.value,
      }
}

const decideDelete = (
  source: ProductSource,
  route: Extract<ProductRoute, { kind: "found" | "missing" }>
): ProductLifecycleDecision => {
  const retry = retryForSource(source)
  if (retry) {
    return retry
  }
  if (source.kind === "found") {
    return { kind: "apply", action: "noop-source-present" }
  }
  if (route.kind === "missing") {
    return { kind: "apply", action: "noop-route-missing" }
  }
  return route.value.route.status === "active"
    ? { kind: "retire", action: "retired", route: route.value }
    : { kind: "apply", action: "noop-route-terminal" }
}

type LifecycleDecisionInput = Readonly<{
  assignment: ProductAssignment
  changeType: ProductLifecycleChangeType
  retireActiveRouteWhenUnpublished: boolean
  route: SourceReadResult<EntityRouteSnapshot>
  source: SourceReadResult<unknown>
}>

const decideLifecycle = ({
  assignment,
  changeType,
  retireActiveRouteWhenUnpublished,
  route,
  source,
}: LifecycleDecisionInput): ProductLifecycleDecision => {
  if (route.kind === "unavailable" || route.kind === "invalid-response") {
    return { kind: "retry", action: null, cause: `route-${route.kind}` }
  }
  return changeType === "reconcile"
    ? decideReconcile(
        assignment,
        source,
        route,
        retireActiveRouteWhenUnpublished
      )
    : decideDelete(source, route)
}

export const decideProductLifecycle = (
  changeType: ProductLifecycleChangeType,
  assignment: ProductAssignment,
  source: SourceReadResult<unknown>,
  route: SourceReadResult<EntityRouteSnapshot>
): ProductLifecycleDecision =>
  decideLifecycle({
    assignment,
    changeType,
    retireActiveRouteWhenUnpublished: false,
    route,
    source,
  })

export const decideTranslationInvalidatedProductLifecycle = (
  changeType: ProductLifecycleChangeType,
  assignment: ProductAssignment,
  source: SourceReadResult<unknown>,
  route: SourceReadResult<EntityRouteSnapshot>
): ProductLifecycleDecision =>
  decideLifecycle({
    assignment,
    changeType,
    retireActiveRouteWhenUnpublished: true,
    route,
    source,
  })

export const decideCatalogLifecycle = (
  changeType: ProductLifecycleChangeType,
  assignment: ProductAssignment,
  source: SourceReadResult<unknown>,
  route: SourceReadResult<EntityRouteSnapshot>
): ProductLifecycleDecision => {
  if (
    changeType === "reconcile" &&
    assignment?.publicationStatus === "published" &&
    source.kind === "missing" &&
    (route.kind === "found" || route.kind === "missing")
  ) {
    // Source proof is exact to the event slug/version. A queued older publish
    // may legitimately be absent after Medusa has advanced to a newer slug.
    // Only an explicit draft/delete/translation-invalidated event may retire a
    // catalog route; acknowledging the stale publish lets its successor apply.
    return { kind: "apply", action: "noop-source-missing" }
  }
  return decideLifecycle({
    assignment,
    changeType,
    retireActiveRouteWhenUnpublished: true,
    route,
    source,
  })
}

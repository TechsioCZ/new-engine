import { createHash } from "node:crypto"
import type { EntityRouteSnapshot, SourceReadResult } from "./contracts"
import type {
  ProductLifecycleChangeType,
  ProductLifecycleDeliveryV1,
} from "./product-lifecycle-parser"

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
      action: "retired"
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
  delivery: ProductLifecycleDeliveryV1
): `sha256:${string}` =>
  `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(delivery)))
    .digest("hex")}`

export const productLifecycleSourceEventId = (
  delivery: ProductLifecycleDeliveryV1
): string => delivery.outboxEventId

type ProductAssignment = ProductLifecycleDeliveryV1["payload"]["assignment"]
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
  route: Extract<ProductRoute, { kind: "found" | "missing" }>
): ProductLifecycleDecision =>
  route.kind === "found" && route.value.route.status === "active"
    ? { kind: "apply", action: "unpublished" }
    : { kind: "apply", action: "noop-unpublished" }

const decideReconcile = (
  assignment: ProductAssignment,
  source: ProductSource,
  route: Extract<ProductRoute, { kind: "found" | "missing" }>
): ProductLifecycleDecision => {
  if (assignment?.publicationStatus !== "published") {
    return unpublishedDecision(route)
  }
  const retry = retryForSource(source)
  if (retry) {
    return retry
  }
  if (source.kind === "missing") {
    return unpublishedDecision(route)
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

export const decideProductLifecycle = (
  changeType: ProductLifecycleChangeType,
  assignment: ProductAssignment,
  source: SourceReadResult<unknown>,
  route: SourceReadResult<EntityRouteSnapshot>
): ProductLifecycleDecision => {
  if (route.kind === "unavailable" || route.kind === "invalid-response") {
    return { kind: "retry", action: null, cause: `route-${route.kind}` }
  }
  return changeType === "reconcile"
    ? decideReconcile(assignment, source, route)
    : decideDelete(source, route)
}

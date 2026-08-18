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
  | "requires-publication"
export type ProductLifecycleReceiptAction = AppliedAction | "retired"
export type ProductLifecycleDecision =
  | Readonly<{ kind: "apply"; action: AppliedAction }>
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

export const decideProductLifecycle = (
  changeType: ProductLifecycleChangeType,
  source: SourceReadResult<unknown>,
  route: SourceReadResult<EntityRouteSnapshot>
): ProductLifecycleDecision => {
  if (source.kind === "unavailable" || source.kind === "invalid-response") {
    return {
      kind: "retry",
      action: null,
      cause: `source-${source.kind}`,
    }
  }
  if (route.kind === "unavailable" || route.kind === "invalid-response") {
    return { kind: "retry", action: null, cause: `route-${route.kind}` }
  }
  if (changeType === "reconcile") {
    if (source.kind === "missing") {
      return { kind: "apply", action: "noop-source-missing" }
    }
    if (route.kind === "missing") {
      return { kind: "apply", action: "requires-publication" }
    }
    return route.value.route.status === "active"
      ? { kind: "apply", action: "noop-source-present" }
      : {
          kind: "conflict",
          action: null,
          cause: "live-source-has-terminal-route",
        }
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

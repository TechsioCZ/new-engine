import { UrlRegistryError } from "./errors"
import { entitySnapshot } from "./memory-snapshot"
import { cloneValue, type MemoryRegistryState, slugKey } from "./memory-state"
import {
  assertEntityKind,
  assertMarket,
  assertNormalizedSegment,
  assertResolveInput,
} from "./memory-validation"
import type { EntityUrlRoute } from "./model"
import type {
  SourceReadResult,
  UrlRegistryBatchResolution,
  UrlRegistryResolution,
  UrlRegistryResolveInput,
  UrlRegistryResolveManyInput,
} from "./reads"

export const resolveOne = (
  state: MemoryRegistryState,
  input: UrlRegistryResolveInput
): SourceReadResult<UrlRegistryResolution> => {
  const key = slugKey(input)
  const slug = [...state.slugs.values()].find(
    (candidate) => slugKey(candidate) === key
  )
  if (!slug) {
    return { kind: "missing" }
  }
  if (slug.routeId === null) {
    return {
      kind: "found",
      value: { disposition: "gone", route: null, matchedSlug: slug },
    }
  }
  const route = state.routes.get(slug.routeId)
  if (!route || route.targetType !== "entity") {
    return { kind: "invalid-response", causeCode: "ORPHANED_SLUG" }
  }
  if (route.status === "retired") {
    return {
      kind: "found",
      value: { disposition: "gone", route, matchedSlug: slug },
    }
  }
  if (route.status === "superseded") {
    return resolveSuperseded(state, route, slug)
  }
  if (slug.disposition === "gone") {
    return {
      kind: "found",
      value: { disposition: "gone", route, matchedSlug: slug },
    }
  }
  const snapshot = entitySnapshot(state, route)
  return {
    kind: "found",
    value:
      slug.disposition === "current"
        ? {
            disposition: "current",
            route,
            matchedSlug: slug,
            currentSlug: snapshot.currentSlug,
          }
        : {
            disposition: "alias",
            route,
            matchedSlug: slug,
            currentSlug: snapshot.currentSlug,
          },
  }
}

const resolveSuperseded = (
  state: MemoryRegistryState,
  route: EntityUrlRoute,
  matchedSlug: UrlRegistryResolution["matchedSlug"]
): SourceReadResult<UrlRegistryResolution> => {
  const successor = route.successorRouteId
    ? state.routes.get(route.successorRouteId)
    : undefined
  if (
    !successor ||
    successor.targetType !== "entity" ||
    successor.status !== "active" ||
    successor.market !== route.market ||
    successor.kind !== route.kind
  ) {
    return { kind: "invalid-response", causeCode: "INVALID_SUCCESSOR_ROUTE" }
  }
  return {
    kind: "found",
    value: {
      disposition: "superseded",
      route,
      matchedSlug,
      successorRoute: successor,
      currentSlug: entitySnapshot(state, successor).currentSlug,
    },
  }
}

export const resolve = (
  state: MemoryRegistryState,
  input: UrlRegistryResolveInput
): SourceReadResult<UrlRegistryResolution> => {
  assertResolveInput(input)
  return cloneValue(resolveOne(state, input))
}

export const resolveMany = (
  state: MemoryRegistryState,
  input: UrlRegistryResolveManyInput
): SourceReadResult<readonly UrlRegistryBatchResolution[]> => {
  if (
    !Array.isArray(input.normalizedSlugs) ||
    input.normalizedSlugs.length > 10
  ) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "resolveMany accepts at most 10 normalized slugs"
    )
  }
  assertMarket(input.market)
  assertEntityKind(input.kind)
  for (const normalizedSlug of input.normalizedSlugs) {
    assertNormalizedSegment(normalizedSlug, "normalizedSlug")
  }
  const value = input.normalizedSlugs.map((normalizedSlug) => {
    const result = resolveOne(state, { ...input, normalizedSlug })
    return {
      normalizedSlug,
      result:
        result.kind === "found"
          ? { kind: "found" as const, value: result.value }
          : { kind: "missing" as const },
    }
  })
  return { kind: "found", value: cloneValue(value) }
}

import type {
  CreateEntityRouteRequest,
  CreateStaticRouteRequest,
} from "./commands"
import { UrlRegistryError } from "./errors"
import {
  assertEntityIdentity,
  assertEntityKind,
  assertMarket,
  assertMetadata,
  assertNonEmpty,
  assertNormalizedSegment,
  assertSafeVersion,
  assertSourceMatchesIdentity,
  assertStaticIdentity,
} from "./memory-validation"
import type { StaticPathMatchMode } from "./model"

export const assertCreateVersion = (expectedVersion: number) => {
  assertSafeVersion(expectedVersion, "expectedVersion", 0)
  if (expectedVersion !== 0) {
    throw new UrlRegistryError(
      "VERSION_CONFLICT",
      "Create commands require expectedVersion 0"
    )
  }
}

export const assertSlugInput = (slug: {
  normalizedSlug: string
  normalizationVersion: number
}) => {
  assertNormalizedSegment(slug.normalizedSlug, "normalizedSlug")
  assertSafeVersion(slug.normalizationVersion, "normalizationVersion", 1)
}

export const assertStaticPathInput = (path: {
  parentRouteKey: string | null
  segment: string
  matchMode: StaticPathMatchMode
}) => {
  if (path.parentRouteKey !== null) {
    assertNonEmpty(path.parentRouteKey, "parentRouteKey", 128)
  }
  assertNormalizedSegment(path.segment, "segment")
  if (path.matchMode !== "exact" && path.matchMode !== "prefix") {
    throw new UrlRegistryError("INVALID_COMMAND", "Invalid static match mode")
  }
}

export const assertEntityCreateRequest = (
  request: CreateEntityRouteRequest
) => {
  assertMarket(request.route.market)
  assertEntityKind(request.route.kind)
  assertEntityIdentity(request.route.identity)
  assertSourceMatchesIdentity(request.source, request.route.identity)
  assertMetadata(request.route)
  assertSlugInput(request.slug)
}

export const assertStaticCreateRequest = (
  request: CreateStaticRouteRequest
) => {
  assertMarket(request.route.market)
  assertStaticIdentity(request.route.identity)
  assertSourceMatchesIdentity(request.source, request.route.identity)
  assertMetadata(request.route)
  assertStaticPathInput(request.path)
}

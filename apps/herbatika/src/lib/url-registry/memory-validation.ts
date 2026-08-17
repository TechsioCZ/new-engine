import type { Market } from "@/lib/url/types"
import type { UrlRegistryCommandSource } from "./commands"
import { UrlRegistryError } from "./errors"
import type {
  EntityRouteIdentity,
  EntityUrlKind,
  UrlRoute,
  UrlRouteIdentity,
} from "./model"
import type { UrlRegistryResolveInput } from "./reads"

const MARKETS = new Set<Market>(["sk", "cz", "hu", "ro"])
const ENTITY_KINDS = new Set<EntityUrlKind>([
  "product",
  "category",
  "brand",
  "collection",
  "campaign",
  "article",
  "page",
])
const NORMALIZED_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const hasControlCharacter = (value: string) =>
  [...value].some((character) => {
    const codePoint = character.codePointAt(0) as number
    return codePoint <= 0x1f || codePoint === 0x7f
  })

export const assertSafeVersion = (
  value: number,
  name: string,
  minimum: number
) => {
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > 2_147_483_647
  ) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      `${name} must be an integer from ${minimum} to 2147483647`,
      { name, value }
    )
  }
}

export const assertNonEmpty = (value: string, name: string, maximum = 255) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value ||
    value.length > maximum ||
    hasControlCharacter(value)
  ) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      `${name} must be a trimmed non-empty string of at most ${maximum} characters`,
      { name }
    )
  }
}

export const assertNormalizedSegment = (value: string, name: string) => {
  if (
    typeof value !== "string" ||
    value.length > 80 ||
    !NORMALIZED_SEGMENT.test(value)
  ) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      `${name} must be a normalized ASCII segment of at most 80 characters`,
      { name, value }
    )
  }
}

export const assertMarket = (market: Market) => {
  if (!MARKETS.has(market)) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      `Unsupported market ${market}`
    )
  }
}

export const assertEntityKind = (kind: EntityUrlKind) => {
  if (!ENTITY_KINDS.has(kind)) {
    throw new UrlRegistryError("INVALID_COMMAND", `Invalid entity kind ${kind}`)
  }
}

export const assertRouteKind = (kind: UrlRoute["kind"]) => {
  if (kind !== "static") {
    assertEntityKind(kind)
  }
}

export const assertMetadata = (metadata: {
  equivalenceKey: string | null
  indexPolicy: "indexable" | "noindex"
}) => {
  if (metadata.equivalenceKey !== null) {
    assertNonEmpty(metadata.equivalenceKey, "equivalenceKey")
  }
  if (
    metadata.indexPolicy !== "indexable" &&
    metadata.indexPolicy !== "noindex"
  ) {
    throw new UrlRegistryError("INVALID_COMMAND", "Invalid index policy")
  }
}

export const assertSource = (source: UrlRegistryCommandSource) => {
  if (!source || typeof source !== "object") {
    throw new UrlRegistryError("INVALID_COMMAND", "Command source is required")
  }
  assertNonEmpty(source.producer, "source.producer", 64)
  assertNonEmpty(source.sourceSystem, "source.sourceSystem", 64)
  assertNonEmpty(source.sourceType, "source.sourceType", 64)
  assertNonEmpty(source.sourceId, "source.sourceId")
  assertNonEmpty(source.sourceVersion, "source.sourceVersion")
  assertNonEmpty(source.sourceEventId, "source.sourceEventId")
}

export const assertEntityIdentity = (identity: EntityRouteIdentity) => {
  if (identity?.targetType !== "entity" || identity.staticRouteKey !== null) {
    throw new UrlRegistryError("INVALID_COMMAND", "Invalid entity identity")
  }
  assertNonEmpty(identity.sourceSystem, "identity.sourceSystem", 64)
  assertNonEmpty(identity.sourceType, "identity.sourceType", 64)
  assertNonEmpty(identity.sourceId, "identity.sourceId")
}

export const assertStaticIdentity = (identity: UrlRouteIdentity) => {
  if (
    identity?.targetType !== "static" ||
    identity.sourceSystem !== null ||
    identity.sourceType !== null ||
    identity.sourceId !== null
  ) {
    throw new UrlRegistryError("INVALID_COMMAND", "Invalid static identity")
  }
  assertNonEmpty(identity.staticRouteKey, "identity.staticRouteKey", 128)
}

export const identityMatchesRoute = (
  identity: UrlRouteIdentity,
  route: UrlRoute
): boolean =>
  identity.targetType === route.targetType &&
  (identity.targetType === "entity"
    ? route.targetType === "entity" &&
      identity.sourceSystem === route.sourceSystem &&
      identity.sourceType === route.sourceType &&
      identity.sourceId === route.sourceId
    : route.targetType === "static" &&
      identity.staticRouteKey === route.staticRouteKey)

export const assertRouteIdentity = (
  route: UrlRoute,
  identity: UrlRouteIdentity
) => {
  if (!identityMatchesRoute(identity, route)) {
    throw new UrlRegistryError(
      "SOURCE_IDENTITY_MISMATCH",
      `Route ${route.id} does not match the asserted stable identity`,
      { routeId: route.id }
    )
  }
}

export const assertSourceMatchesIdentity = (
  source: UrlRegistryCommandSource,
  identity: UrlRouteIdentity
) => {
  assertSource(source)
  const matches =
    identity.targetType === "entity"
      ? source.sourceSystem === identity.sourceSystem &&
        source.sourceType === identity.sourceType &&
        source.sourceId === identity.sourceId
      : source.sourceId === identity.staticRouteKey
  if (!matches) {
    throw new UrlRegistryError(
      "SOURCE_IDENTITY_MISMATCH",
      "Command source does not match the stable route identity"
    )
  }
}

export const assertResolveInput = (input: UrlRegistryResolveInput) => {
  assertMarket(input.market)
  assertEntityKind(input.kind)
  assertNormalizedSegment(input.normalizedSlug, "normalizedSlug")
}

export const nextVersion = (version: number): number => {
  const next = version + 1
  assertSafeVersion(next, "resultVersion", 1)
  return next
}

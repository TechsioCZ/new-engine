import type {
  EntityUrlKind,
  UrlRegistryCommand,
  UrlRegistryCommandSource,
  UrlRoute,
  UrlRouteIdentity,
} from "../contracts"
import { UrlRegistryError } from "../errors"

const MARKETS = new Set(["sk", "cz", "hu", "ro"])
const ENTITY_KINDS = new Set([
  "product",
  "category",
  "brand",
  "collection",
  "campaign",
  "article",
  "page",
])
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REQUEST_FINGERPRINT = /^sha256:[0-9a-f]{64}$/

const hasControlCharacter = (value: string) =>
  [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint < 32 || codePoint === 127
  })

export const assertText = (value: unknown, name: string, maximum = 255) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value ||
    value.length > maximum ||
    hasControlCharacter(value)
  ) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      `${name} must be a trimmed non-empty string of at most ${maximum} characters`
    )
  }
}

export const assertInteger = (
  value: unknown,
  name: string,
  minimum: number
) => {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > 2_147_483_647
  ) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      `${name} must be an integer from ${minimum} to 2147483647`
    )
  }
}

export const assertUuid = (value: unknown, name: string) => {
  if (typeof value !== "string" || !UUID.test(value)) {
    throw new UrlRegistryError("INVALID_COMMAND", `${name} must be a UUID`)
  }
}

export const assertMarket = (value: unknown) => {
  if (typeof value !== "string" || !MARKETS.has(value)) {
    throw new UrlRegistryError("INVALID_COMMAND", "Unsupported URL market")
  }
}

export const assertEntityKind: (
  value: unknown
) => asserts value is EntityUrlKind = (value) => {
  if (typeof value !== "string" || !ENTITY_KINDS.has(value)) {
    throw new UrlRegistryError("INVALID_COMMAND", "Unsupported entity URL kind")
  }
}

export const assertSegment = (value: unknown, name: string) => {
  if (typeof value !== "string" || value.length > 80 || !SEGMENT.test(value)) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      `${name} must be a normalized ASCII segment of at most 80 characters`
    )
  }
}

export const assertIdentity = (identity: UrlRouteIdentity) => {
  if (identity.targetType === "entity") {
    assertText(identity.sourceSystem, "identity.sourceSystem", 64)
    assertText(identity.sourceType, "identity.sourceType", 64)
    assertText(identity.sourceId, "identity.sourceId")
    return
  }
  assertText(identity.staticRouteKey, "identity.staticRouteKey", 128)
}

export const assertSource = (source: UrlRegistryCommandSource) => {
  assertText(source.producer, "source.producer", 64)
  assertText(source.sourceSystem, "source.sourceSystem", 64)
  assertText(source.sourceType, "source.sourceType", 64)
  assertText(source.sourceId, "source.sourceId")
  assertText(source.sourceVersion, "source.sourceVersion")
  assertText(source.sourceEventId, "source.sourceEventId")
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

export const assertEnvelope = (
  command: UrlRegistryCommand,
  expectedType: UrlRegistryCommand["request"]["commandType"]
) => {
  if (typeof command !== "object" || command === null) {
    throw new UrlRegistryError("INVALID_COMMAND", "Command must be an object")
  }
  const envelope = command as unknown as Record<string, unknown>
  const request = envelope.request
  if (
    typeof request !== "object" ||
    request === null ||
    Array.isArray(request)
  ) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Command request must be an object"
    )
  }
  const requestRecord = request as Record<string, unknown>
  const source = requestRecord.source
  if (typeof source !== "object" || source === null || Array.isArray(source)) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Command source must be an object"
    )
  }
  if (
    envelope.commandVersion !== 1 ||
    requestRecord.commandType !== expectedType
  ) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      `Expected a version 1 ${expectedType} command`
    )
  }
  assertText(envelope.idempotencyKey, "idempotencyKey")
  if (
    typeof envelope.requestFingerprint !== "string" ||
    !REQUEST_FINGERPRINT.test(envelope.requestFingerprint)
  ) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "requestFingerprint must be a lowercase SHA-256 fingerprint"
    )
  }
  assertInteger(requestRecord.expectedVersion, "expectedVersion", 0)
  assertSource(source as UrlRegistryCommandSource)
}

export const assertRouteIdentity = (
  route: UrlRoute,
  identity: UrlRouteIdentity
) => {
  const matches =
    route.targetType === identity.targetType &&
    (identity.targetType === "entity"
      ? route.targetType === "entity" &&
        route.sourceSystem === identity.sourceSystem &&
        route.sourceType === identity.sourceType &&
        route.sourceId === identity.sourceId
      : route.targetType === "static" &&
        route.staticRouteKey === identity.staticRouteKey)
  if (!matches) {
    throw new UrlRegistryError(
      "SOURCE_IDENTITY_MISMATCH",
      `Route ${route.id} does not match the asserted stable identity`
    )
  }
}

export const assertExpectedVersion = (route: UrlRoute, expected: number) => {
  if (route.version !== expected) {
    throw new UrlRegistryError(
      "VERSION_CONFLICT",
      `Expected route ${route.id} at version ${expected}, received ${route.version}`,
      {
        routeId: route.id,
        expectedVersion: expected,
        actualVersion: route.version,
      }
    )
  }
}

export const assertMutableRoute = (route: UrlRoute, expected: number) => {
  assertExpectedVersion(route, expected)
  if (route.status !== "active") {
    throw new UrlRegistryError(
      "INVALID_TRANSITION",
      `Only an active route can be mutated; ${route.id} is ${route.status}`
    )
  }
}

export const assertMetadata = (input: {
  equivalenceKey: string | null
  indexPolicy: string
}) => {
  if (input.equivalenceKey !== null) {
    assertText(input.equivalenceKey, "equivalenceKey")
  }
  if (input.indexPolicy !== "indexable" && input.indexPolicy !== "noindex") {
    throw new UrlRegistryError("INVALID_COMMAND", "Invalid index policy")
  }
}

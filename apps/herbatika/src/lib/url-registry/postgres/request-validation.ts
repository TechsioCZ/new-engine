import type {
  EntityRouteIdentity,
  StaticRouteIdentity,
  UrlRegistryCommand,
  UrlRegistryCommandRequest,
  UrlRegistryCommandSource,
  UrlRouteIdentity,
} from "../contracts"
import { UrlRegistryError } from "../errors"
import {
  assertEntityKind,
  assertInteger,
  assertMarket,
  assertMetadata,
  assertSegment,
  assertSourceMatchesIdentity,
  assertText,
  assertUuid,
} from "./input-validation"

type UnknownRecord = Record<string, unknown>

const record = (value: unknown, name: string): UnknownRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new UrlRegistryError("INVALID_COMMAND", `${name} must be an object`)
  }
  return value as UnknownRecord
}

const entityIdentity = (value: unknown): EntityRouteIdentity => {
  const identity = record(value, "identity")
  if (identity.targetType !== "entity" || identity.staticRouteKey !== null) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Invalid entity identity shape"
    )
  }
  assertText(identity.sourceSystem, "identity.sourceSystem", 64)
  assertText(identity.sourceType, "identity.sourceType", 64)
  assertText(identity.sourceId, "identity.sourceId")
  return identity as EntityRouteIdentity
}

const staticIdentity = (value: unknown): StaticRouteIdentity => {
  const identity = record(value, "identity")
  if (
    identity.targetType !== "static" ||
    identity.sourceSystem !== null ||
    identity.sourceType !== null ||
    identity.sourceId !== null
  ) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Invalid static identity shape"
    )
  }
  assertText(identity.staticRouteKey, "identity.staticRouteKey", 128)
  return identity as StaticRouteIdentity
}

const identity = (value: unknown): UrlRouteIdentity => {
  const candidate = record(value, "identity")
  return candidate.targetType === "entity"
    ? entityIdentity(candidate)
    : staticIdentity(candidate)
}

const target = (value: unknown) => {
  const candidate = record(value, "target")
  assertUuid(candidate.routeId, "target.routeId")
  return {
    routeId: candidate.routeId as string,
    identity: identity(candidate.identity),
  }
}

const slug = (value: unknown) => {
  const candidate = record(value, "slug")
  assertSegment(candidate.normalizedSlug, "normalizedSlug")
  assertInteger(candidate.normalizationVersion, "normalizationVersion", 1)
}

const path = (value: unknown) => {
  const candidate = record(value, "path")
  if (candidate.parentRouteKey !== null) {
    assertText(candidate.parentRouteKey, "parentRouteKey", 128)
  }
  assertSegment(candidate.segment, "segment")
  if (candidate.matchMode !== "exact" && candidate.matchMode !== "prefix") {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Invalid static path match mode"
    )
  }
}

const metadata = (value: unknown) => {
  const candidate = record(value, "metadata")
  assertMetadata({
    equivalenceKey: candidate.equivalenceKey as string | null,
    indexPolicy: candidate.indexPolicy as string,
  })
}

const requireCreateVersion = (request: UnknownRecord) => {
  if (request.expectedVersion !== 0) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Create expectedVersion must be 0"
    )
  }
}

const validateCreateEntity = (
  request: UnknownRecord,
  source: UrlRegistryCommandSource
) => {
  requireCreateVersion(request)
  const route = record(request.route, "route")
  assertMarket(route.market)
  assertEntityKind(route.kind)
  const routeIdentity = entityIdentity(route.identity)
  assertSourceMatchesIdentity(source, routeIdentity)
  metadata(route)
  slug(request.slug)
}

const validateCreateStatic = (
  request: UnknownRecord,
  source: UrlRegistryCommandSource
) => {
  requireCreateVersion(request)
  const route = record(request.route, "route")
  if (route.kind !== "static") {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Static route kind must be static"
    )
  }
  assertMarket(route.market)
  const routeIdentity = staticIdentity(route.identity)
  assertSourceMatchesIdentity(source, routeIdentity)
  metadata(route)
  path(request.path)
}

const validateTargetCommand = (
  request: UnknownRecord,
  source: UrlRegistryCommandSource,
  projection?: "entity" | "static"
) => {
  const commandTarget = target(request.target)
  if (projection && commandTarget.identity.targetType !== projection) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      `Expected ${projection} target`
    )
  }
  assertSourceMatchesIdentity(source, commandTarget.identity)
  return commandTarget
}

export const assertCommandRequest = (
  command: UrlRegistryCommand,
  expectedType: UrlRegistryCommandRequest["commandType"]
) => {
  const envelope = record(command, "command")
  const request = record(envelope.request, "request")
  const source = record(request.source, "source") as UrlRegistryCommandSource
  switch (expectedType) {
    case "create-entity-route":
      validateCreateEntity(request, source)
      return
    case "create-static-route":
      validateCreateStatic(request, source)
      return
    case "change-slug":
      validateTargetCommand(request, source, "entity")
      slug(request.slug)
      return
    case "change-static-path":
      validateTargetCommand(request, source, "static")
      path(request.path)
      return
    case "update-route":
      validateTargetCommand(request, source)
      metadata(request.metadata)
      return
    case "retire-route":
      validateTargetCommand(request, source)
      return
    case "supersede-route": {
      const commandTarget = validateTargetCommand(request, source)
      const successor = target(request.successor)
      if (successor.identity.targetType !== commandTarget.identity.targetType) {
        throw new UrlRegistryError(
          "INVALID_TRANSITION",
          "Successor projection type must match target"
        )
      }
      return
    }
    case "register-gone": {
      requireCreateVersion(request)
      const gone = record(request.slug, "slug")
      assertMarket(gone.market)
      assertEntityKind(gone.kind)
      slug(gone)
      return
    }
    default:
      throw new UrlRegistryError("INVALID_COMMAND", "Unknown command type")
  }
}

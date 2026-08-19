import { buildPath } from "@/lib/url/public-url"
import type { Market } from "@/lib/url/types"
import type { UrlRegistry } from "../contracts"
import type { ActiveEntityRouteTarget } from "../model"
import { readBoundedTextBody } from "./bounded-body-reader"
import { verifyBearerAuthorization } from "./command-auth"

const MAX_BODY_BYTES = 64 * 1024
const MAX_PROJECTION_ENTRIES = 100
const SOURCE_ID_MAX_LENGTH = 255
const PRIVATE_NO_STORE = "private, no-store, max-age=0"
const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const MARKETS = new Set<Market>(["sk", "cz", "hu", "ro"])
const SOURCE_TYPES = new Set<ContentProjectionSourceType>(["article", "page"])

const responseHeaders = {
  "cache-control": PRIVATE_NO_STORE,
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow",
}

export type ContentProjectionSourceType = "article" | "page"

export type ContentProjectionRequest = Readonly<{
  schemaVersion: 1
  market: Market
  requestId: string
  entries: readonly Readonly<{
    sourceId: string
    sourceType: ContentProjectionSourceType
  }>[]
}>

export type ContentProjectionResponse = Readonly<{
  schemaVersion: 1
  market: Market
  requestId: string
  projections: readonly Readonly<{
    sourceId: string
    sourceType: ContentProjectionSourceType
    href: string
    routeVersion: number
  }>[]
}>

type ContentProjectionEndpointDependencies = Readonly<{
  enabled: boolean
  projectionToken: string | undefined
  readRegistry(): Promise<UrlRegistry>
}>

const jsonError = (error: string, status: number, headers?: HeadersInit) =>
  Response.json(
    { error },
    { headers: { ...responseHeaders, ...headers }, status }
  )

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const hasControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0)
    return code <= 31 || code === 127
  })

const isSourceId = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= SOURCE_ID_MAX_LENGTH &&
  value === value.trim() &&
  !hasControlCharacter(value)

const parseProjectionRequest = (
  value: unknown
): ContentProjectionRequest | null => {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.requestId !== "string" ||
    !REQUEST_ID_PATTERN.test(value.requestId) ||
    typeof value.market !== "string" ||
    !MARKETS.has(value.market as Market) ||
    !Array.isArray(value.entries) ||
    value.entries.length < 1 ||
    value.entries.length > MAX_PROJECTION_ENTRIES
  ) {
    return null
  }

  const entries: Array<{
    sourceId: string
    sourceType: ContentProjectionSourceType
  }> = []
  const identities = new Set<string>()

  for (const entry of value.entries) {
    if (
      !(isRecord(entry) && isSourceId(entry.sourceId)) ||
      typeof entry.sourceType !== "string" ||
      !SOURCE_TYPES.has(entry.sourceType as ContentProjectionSourceType)
    ) {
      return null
    }
    const sourceType = entry.sourceType as ContentProjectionSourceType
    const identity = `${sourceType}\u0000${entry.sourceId}`
    if (identities.has(identity)) {
      return null
    }
    identities.add(identity)
    entries.push({ sourceId: entry.sourceId, sourceType })
  }

  return {
    entries,
    market: value.market as Market,
    requestId: value.requestId,
    schemaVersion: 1,
  }
}

const readProjectionRequest = async (
  request: Request
): Promise<
  | Readonly<{ kind: "valid"; value: ContentProjectionRequest }>
  | Readonly<{ kind: "invalid" }>
  | Readonly<{ kind: "too-large" }>
> => {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase()
  if (mediaType !== "application/json") {
    return { kind: "invalid" }
  }

  const body = await readBoundedTextBody(request, MAX_BODY_BYTES)
  if (body.kind === "too-large") {
    return body
  }
  if (body.kind !== "text") {
    return { kind: "invalid" }
  }

  try {
    const parsed = parseProjectionRequest(JSON.parse(body.value))
    return parsed ? { kind: "valid", value: parsed } : { kind: "invalid" }
  } catch {
    return { kind: "invalid" }
  }
}

const isExactProjection = (
  projection: ActiveEntityRouteTarget,
  entry: ContentProjectionRequest["entries"][number],
  market: Market
) =>
  projection.projectionType === "entity" &&
  projection.route.market === market &&
  projection.route.kind === entry.sourceType &&
  projection.route.targetType === "entity" &&
  projection.route.sourceSystem === "payload" &&
  projection.route.sourceType === entry.sourceType &&
  projection.route.sourceId === entry.sourceId &&
  projection.route.status === "active" &&
  Number.isSafeInteger(projection.route.version) &&
  projection.route.version > 0 &&
  projection.currentSlug.market === market &&
  projection.currentSlug.kind === entry.sourceType &&
  projection.currentSlug.routeId === projection.route.id &&
  projection.currentSlug.disposition === "current"

const projectEntries = async (
  registry: UrlRegistry,
  input: ContentProjectionRequest
): Promise<ContentProjectionResponse["projections"] | null> => {
  const projections: ContentProjectionResponse["projections"][number][] = []

  for (const entry of input.entries) {
    const result = await registry.findActiveEntityRoute({
      market: input.market,
      sourceId: entry.sourceId,
      sourceSystem: "payload",
      sourceType: entry.sourceType,
    })
    if (result.kind === "missing") {
      continue
    }
    if (
      result.kind !== "found" ||
      !isExactProjection(result.value, entry, input.market)
    ) {
      return null
    }
    if (result.value.route.indexPolicy !== "indexable") {
      continue
    }

    projections.push({
      href: buildPath(
        {
          kind: entry.sourceType,
          slug: result.value.currentSlug.normalizedSlug,
        },
        input.market
      ),
      routeVersion: result.value.route.version,
      sourceId: entry.sourceId,
      sourceType: entry.sourceType,
    })
  }

  return projections
}

export const handleContentProjectionRequest = async (
  request: Request,
  dependencies: ContentProjectionEndpointDependencies
): Promise<Response> => {
  if (!dependencies.enabled) {
    return jsonError("not-found", 404)
  }

  const authorization = verifyBearerAuthorization(
    request.headers.get("authorization"),
    dependencies.projectionToken
  )
  if (authorization === "misconfigured") {
    return jsonError("service-unavailable", 503, { "retry-after": "5" })
  }
  if (authorization !== "authorized") {
    return jsonError("unauthorized", 401, { "www-authenticate": "Bearer" })
  }

  let parsed: Awaited<ReturnType<typeof readProjectionRequest>>
  try {
    parsed = await readProjectionRequest(request)
  } catch {
    return jsonError("service-unavailable", 503, { "retry-after": "5" })
  }
  if (parsed.kind === "too-large") {
    return jsonError("payload-too-large", 413)
  }
  if (parsed.kind !== "valid") {
    return jsonError("invalid-request", 400)
  }

  try {
    const registry = await dependencies.readRegistry()
    const projections = await projectEntries(registry, parsed.value)
    if (!projections) {
      return jsonError("invalid-projection", 503, { "retry-after": "5" })
    }

    return Response.json(
      {
        market: parsed.value.market,
        projections,
        requestId: parsed.value.requestId,
        schemaVersion: 1,
      } satisfies ContentProjectionResponse,
      { headers: responseHeaders, status: 200 }
    )
  } catch {
    return jsonError("service-unavailable", 503, { "retry-after": "5" })
  }
}

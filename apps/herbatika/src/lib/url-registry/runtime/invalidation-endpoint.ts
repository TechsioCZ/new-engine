import { readBoundedTextBody } from "../http/bounded-body-reader"
import { verifyBearerAuthorization } from "../http/command-auth"
import {
  type UrlRegistryInvalidationAcknowledgement,
  UrlRegistryInvalidationConflictError,
} from "./invalidation-consumer"
import {
  parseUrlRegistryInvalidationDeliveryJson,
  type UrlRegistryInvalidationDeliveryV1,
} from "./invalidation-contract"

const MAX_BODY_BYTES = 64 * 1024
const RESPONSE_HEADERS = Object.freeze({
  "cache-control": "private, no-store, max-age=0",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow, noarchive",
})

type InvalidationEndpointDependencies = Readonly<{
  consume(
    delivery: UrlRegistryInvalidationDeliveryV1
  ): Promise<UrlRegistryInvalidationAcknowledgement>
  enabled: boolean
  isExpectedHost(host: string | null): boolean
  token: string | undefined
}>

const json = (body: unknown, status: number, headers?: HeadersInit) =>
  Response.json(body, {
    headers: { ...RESPONSE_HEADERS, ...headers },
    status,
  })

const jsonError = (error: string, status: number, headers?: HeadersInit) =>
  json({ error }, status, headers)

const mediaTypeIsJson = (request: Request): boolean =>
  request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase() === "application/json"

export const handleUrlRegistryInvalidationRequest = async (
  request: Request,
  dependencies: InvalidationEndpointDependencies
): Promise<Response> => {
  if (!dependencies.enabled) {
    return jsonError("not-found", 404)
  }

  let expectedHost: boolean
  try {
    expectedHost = dependencies.isExpectedHost(request.headers.get("host"))
  } catch {
    return jsonError("service-unavailable", 503, { "retry-after": "5" })
  }
  if (!expectedHost) {
    return jsonError("misdirected-request", 421)
  }

  const authorization = verifyBearerAuthorization(
    request.headers.get("authorization"),
    dependencies.token
  )
  if (authorization === "misconfigured") {
    return jsonError("service-unavailable", 503, { "retry-after": "5" })
  }
  if (authorization !== "authorized") {
    return jsonError("unauthorized", 401, { "www-authenticate": "Bearer" })
  }
  if (!mediaTypeIsJson(request)) {
    return jsonError("invalid-delivery", 400)
  }

  let body: Awaited<ReturnType<typeof readBoundedTextBody>>
  try {
    body = await readBoundedTextBody(request, MAX_BODY_BYTES)
  } catch {
    return jsonError("service-unavailable", 503, { "retry-after": "5" })
  }
  if (body.kind === "too-large") {
    return jsonError("payload-too-large", 413)
  }
  if (body.kind !== "text") {
    return jsonError("invalid-delivery", 400)
  }

  const delivery = parseUrlRegistryInvalidationDeliveryJson(body.value)
  if (!delivery) {
    return jsonError("invalid-delivery", 400)
  }

  try {
    return json(await dependencies.consume(delivery), 200)
  } catch (error) {
    if (error instanceof UrlRegistryInvalidationConflictError) {
      return jsonError("event-id-conflict", 409)
    }
    return jsonError("service-unavailable", 503, { "retry-after": "5" })
  }
}

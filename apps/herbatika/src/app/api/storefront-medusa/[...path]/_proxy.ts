import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { resolveMedusaBackendUrl } from "@/lib/storefront/runtime-env"
import {
  getSessionTokenFromCookieHeader,
  marketAuthorityError,
  requireStorefrontMarketBinding,
  StorefrontMarketAuthorityError,
} from "../../storefront-auth/_lib"
import {
  bodyHasValidMarketScope,
  hasSameOriginCsrfEvidence,
  queryHasValidMarketScope,
  resolveGatewayPath,
} from "./_policy"
import { buildGatewayResponse, jsonError } from "./_response"
import { allowedMethodsForPath, type GatewayMethod } from "./_routes"

const GATEWAY_TIMEOUT_MS = 10_000
const MAX_BODY_BYTES = 1024 * 1024
const MAX_QUERY_BYTES = 16 * 1024
const BEARER_TOKEN_PATTERN = /^[A-Za-z0-9._~+/=-]+$/
const JSON_CONTENT_TYPE_PATTERN = /^(?:application\/json|[^;]+\+json)(?:;|$)/
const BODY_METHODS = new Set<GatewayMethod>(["POST"])
const UNSAFE_METHODS = new Set<GatewayMethod>(["DELETE", "POST"])

const SAFE_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "idempotency-key",
] as const

type RouteParams = Readonly<{
  path: readonly string[]
}>

export type StorefrontMedusaRouteContext = Readonly<{
  params: Promise<RouteParams>
}>

const safeBearerToken = (token: string | null): string | null => {
  if (!token || token.length > 8192 || !BEARER_TOKEN_PATTERN.test(token)) {
    return null
  }
  return token
}

const buildUpstreamHeaders = (
  request: Request,
  binding: MarketRuntimeBinding
) => {
  const headers = new Headers()
  for (const name of SAFE_REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value) {
      headers.set(name, value)
    }
  }

  headers.set("x-medusa-locale", binding.locale)
  headers.set("x-publishable-api-key", binding.publishableApiKey)

  const sessionToken = safeBearerToken(
    getSessionTokenFromCookieHeader(request.headers.get("cookie"))
  )
  if (sessionToken) {
    headers.set("authorization", `Bearer ${sessionToken}`)
  }

  return headers
}

const readValidatedBody = async (
  request: Request,
  method: GatewayMethod,
  binding: MarketRuntimeBinding
): Promise<ArrayBuffer | null | Response> => {
  if (!BODY_METHODS.has(method)) {
    return null
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonError(413, "Request body is too large.")
  }

  const body = await request.arrayBuffer()
  if (body.byteLength === 0) {
    return null
  }
  if (body.byteLength > MAX_BODY_BYTES) {
    return jsonError(413, "Request body is too large.")
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? ""
  if (!JSON_CONTENT_TYPE_PATTERN.test(contentType)) {
    return jsonError(415, "Only JSON request bodies are accepted.")
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(new TextDecoder().decode(body))
  } catch {
    return jsonError(400, "Request body must contain valid JSON.")
  }

  if (!bodyHasValidMarketScope(parsedBody, binding)) {
    return jsonError(400, "Request market scope is not allowed.")
  }

  return body
}

export const handleStorefrontMedusaRequest = async (
  request: Request,
  context: StorefrontMedusaRouteContext
): Promise<Response> => {
  let binding: MarketRuntimeBinding
  try {
    binding = requireStorefrontMarketBinding(request)
  } catch (error) {
    if (error instanceof StorefrontMarketAuthorityError) {
      const response = marketAuthorityError()
      response.headers.set("cache-control", "private, no-store, max-age=0")
      return response
    }
    return jsonError(500, "Storefront gateway configuration failed.")
  }

  const { path: pathSegments } = await context.params
  const gatewayPath = resolveGatewayPath(request, pathSegments)
  if (!gatewayPath) {
    return jsonError(400, "Invalid storefront API path.")
  }

  const allowedMethods = allowedMethodsForPath(gatewayPath)
  if (allowedMethods.length === 0) {
    return jsonError(404, "Storefront API path is not available.")
  }

  const method = request.method.toUpperCase() as GatewayMethod
  if (!allowedMethods.includes(method)) {
    return jsonError(
      405,
      "Method is not allowed for this storefront API path.",
      {
        allow: allowedMethods.join(", "),
      }
    )
  }

  if (
    UNSAFE_METHODS.has(method) &&
    !hasSameOriginCsrfEvidence(request, binding)
  ) {
    return jsonError(403, "Same-origin request required.")
  }

  const requestUrl = new URL(request.url)
  if (
    requestUrl.search.length > MAX_QUERY_BYTES ||
    !queryHasValidMarketScope(requestUrl.searchParams, binding, gatewayPath)
  ) {
    return jsonError(400, "Request market scope is not allowed.")
  }

  const body = await readValidatedBody(request, method, binding)
  if (body instanceof Response) {
    return body
  }

  const upstreamUrl = new URL(gatewayPath, resolveMedusaBackendUrl())
  upstreamUrl.search = requestUrl.search

  try {
    const upstream = await fetch(upstreamUrl, {
      body,
      cache: "no-store",
      credentials: "omit",
      headers: buildUpstreamHeaders(request, binding),
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
    })

    return await buildGatewayResponse(upstream, binding)
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return jsonError(504, "Storefront API request timed out.")
    }
    return jsonError(502, "Storefront API request failed.")
  }
}

import { resolveStorefrontApiMessages } from "@/app/api/_messages"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { resolveMedusaBackendUrl } from "@/lib/storefront/runtime-env"
import { readCartSession } from "../../storefront/checkout/_lib"
import {
  getSessionTokenFromCookieHeader,
  marketAuthorityError,
  requireStorefrontMarketBinding,
  StorefrontMarketAuthorityError,
} from "../../storefront-auth/_lib"
import {
  GATEWAY_TIMEOUT_MS,
  verifyCheckoutResourceAuthority,
  verifyResourceMarketAuthority,
} from "./_authority"
import {
  logGatewayFailure,
  REQUEST_ID_HEADER,
  resolveRequestId,
  STOREFRONT_ORIGIN_HEADER,
  withRequestId,
} from "./_observability"
import {
  bodyHasValidMarketScope,
  hasSameOriginCsrfEvidence,
  pathHasValidMarketScope,
  queryHasValidMarketScope,
  resolveGatewayPath,
} from "./_policy"
import { buildGatewayResponse, jsonError } from "./_response"
import {
  allowedMethodsForPath,
  type GatewayMethod,
  type GatewayPathAuthority,
  resolveGatewayPathAuthority,
} from "./_routes"

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

type ValidatedGatewayRoute = Readonly<{
  gatewayPath: string
  method: GatewayMethod
  pathAuthority: GatewayPathAuthority | null
  requestUrl: URL
}>

const safeBearerToken = (token: string | null): string | null => {
  if (!token || token.length > 8192 || !BEARER_TOKEN_PATTERN.test(token)) {
    return null
  }
  return token
}

const buildUpstreamHeaders = (
  request: Request,
  binding: MarketRuntimeBinding,
  requestId: string
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
  headers.set(REQUEST_ID_HEADER, requestId)
  headers.set(STOREFRONT_ORIGIN_HEADER, "storefront-gateway")

  const sessionToken = safeBearerToken(
    getSessionTokenFromCookieHeader(request.headers.get("cookie"))
  )
  if (sessionToken) {
    headers.set("authorization", `Bearer ${sessionToken}`)
  }

  const cartSession = safeBearerToken(readCartSession(request))
  if (cartSession) {
    headers.set("x-cart-session", cartSession)
  }

  return headers
}

const readValidatedBody = async (
  request: Request,
  method: GatewayMethod,
  binding: MarketRuntimeBinding
): Promise<ArrayBuffer | null | Response> => {
  const messages = resolveStorefrontApiMessages(binding.market)
  if (!BODY_METHODS.has(method)) {
    return null
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonError(413, messages.gatewayRequestBodyTooLarge)
  }

  const body = await request.arrayBuffer()
  if (body.byteLength === 0) {
    return null
  }
  if (body.byteLength > MAX_BODY_BYTES) {
    return jsonError(413, messages.gatewayRequestBodyTooLarge)
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? ""
  if (!JSON_CONTENT_TYPE_PATTERN.test(contentType)) {
    return jsonError(415, messages.gatewayJsonOnly)
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(new TextDecoder().decode(body))
  } catch {
    return jsonError(400, messages.gatewayValidJsonRequired)
  }

  if (!bodyHasValidMarketScope(parsedBody, binding)) {
    return jsonError(400, messages.gatewayScopeNotAllowed)
  }

  return body
}

const resolveValidatedGatewayRoute = async (
  request: Request,
  context: StorefrontMedusaRouteContext,
  binding: MarketRuntimeBinding
): Promise<Response | ValidatedGatewayRoute> => {
  const messages = resolveStorefrontApiMessages(binding.market)
  const { path: pathSegments } = await context.params
  const gatewayPath = resolveGatewayPath(request, pathSegments)
  if (!gatewayPath) {
    return jsonError(400, messages.gatewayInvalidPath)
  }

  const allowedMethods = allowedMethodsForPath(gatewayPath)
  if (allowedMethods.length === 0) {
    return jsonError(404, messages.gatewayStorefrontPathUnavailable)
  }

  const method = request.method.toUpperCase() as GatewayMethod
  if (!allowedMethods.includes(method)) {
    return jsonError(405, messages.gatewayMethodNotAllowed, {
      allow: allowedMethods.join(", "),
    })
  }

  if (
    UNSAFE_METHODS.has(method) &&
    !hasSameOriginCsrfEvidence(request, binding)
  ) {
    return jsonError(403, messages.sameOriginRequired)
  }

  const pathAuthority = resolveGatewayPathAuthority(gatewayPath)
  if (!pathHasValidMarketScope(pathAuthority, binding)) {
    return jsonError(400, messages.gatewayScopeNotAllowed)
  }

  const requestUrl = new URL(request.url)
  if (
    requestUrl.search.length > MAX_QUERY_BYTES ||
    !queryHasValidMarketScope(requestUrl.searchParams, binding, gatewayPath)
  ) {
    return jsonError(400, messages.gatewayScopeNotAllowed)
  }

  return { gatewayPath, method, pathAuthority, requestUrl }
}

const verifyGatewayResourceAuthority = (
  headers: Headers,
  authority: GatewayPathAuthority | null,
  body: ArrayBuffer | null,
  binding: MarketRuntimeBinding
): Promise<Response | null> | null => {
  if (authority?.kind === "cart" || authority?.kind === "order") {
    return verifyResourceMarketAuthority(headers, authority, binding)
  }
  if (
    authority?.kind === "payment-collection-create" ||
    authority?.kind === "payment-collection" ||
    authority?.kind === "shipping-option"
  ) {
    return verifyCheckoutResourceAuthority(
      headers,
      authority,
      body ? JSON.parse(new TextDecoder().decode(body)) : null,
      binding
    )
  }
  return null
}

export const handleStorefrontMedusaRequest = async (
  request: Request,
  context: StorefrontMedusaRouteContext
): Promise<Response> => {
  const requestId = resolveRequestId(request.headers)
  let binding: MarketRuntimeBinding
  try {
    binding = requireStorefrontMarketBinding(request)
  } catch (error) {
    if (error instanceof StorefrontMarketAuthorityError) {
      const response = marketAuthorityError()
      response.headers.set("cache-control", "private, no-store, max-age=0")
      return withRequestId(response, requestId)
    }
    logGatewayFailure({ failure: "configuration", requestId })
    return withRequestId(
      jsonError(500, "Storefront gateway configuration failed."),
      requestId
    )
  }
  const messages = resolveStorefrontApiMessages(binding.market)

  const validatedRoute = await resolveValidatedGatewayRoute(
    request,
    context,
    binding
  )
  if (validatedRoute instanceof Response) {
    return withRequestId(validatedRoute, requestId)
  }

  const { gatewayPath, method, pathAuthority, requestUrl } = validatedRoute

  const body = await readValidatedBody(request, method, binding)
  if (body instanceof Response) {
    return withRequestId(body, requestId)
  }

  const upstreamHeaders = buildUpstreamHeaders(request, binding, requestId)
  const authorityError = await verifyGatewayResourceAuthority(
    upstreamHeaders,
    pathAuthority,
    body,
    binding
  )
  if (authorityError) {
    return withRequestId(authorityError, requestId)
  }

  const upstreamUrl = new URL(gatewayPath, resolveMedusaBackendUrl())
  upstreamUrl.search = requestUrl.search

  try {
    const upstream = await fetch(upstreamUrl, {
      body,
      cache: "no-store",
      credentials: "omit",
      headers: upstreamHeaders,
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
    })

    if (upstream.status >= 500) {
      logGatewayFailure({
        binding,
        failure: "upstream_5xx",
        path: gatewayPath,
        requestId,
      })
    }
    return withRequestId(
      await buildGatewayResponse(upstream, binding),
      requestId
    )
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      logGatewayFailure({
        binding,
        failure: "upstream_timeout",
        path: gatewayPath,
        requestId,
      })
      return withRequestId(
        jsonError(504, messages.gatewayRequestTimedOut),
        requestId
      )
    }
    logGatewayFailure({
      binding,
      failure: "upstream_unavailable",
      path: gatewayPath,
      requestId,
    })
    return withRequestId(
      jsonError(502, messages.gatewayRequestFailed),
      requestId
    )
  }
}

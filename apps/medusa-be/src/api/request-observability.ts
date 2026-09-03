import { randomUUID } from "node:crypto"
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

export const REQUEST_ID_HEADER = "x-request-id"

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const RELEASE_SHA_PATTERN = /^[0-9a-f]{40}$/
const SAFE_DEPLOYMENT_VALUE_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/
const DEPLOYMENT_SLOT_PATTERN = /^(?:blue|green)$/
const SAFE_ERROR_TYPES = new Set([
  "AbortError",
  "AggregateError",
  "DOMException",
  "Error",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TimeoutError",
  "TypeError",
  "URIError",
])
const MARKET_BY_LOCALE = Object.freeze({
  "cs-CZ": "cz",
  "hu-HU": "hu",
  "ro-RO": "ro",
  "sk-SK": "sk",
} as const)

type ApiRouteClass =
  | "admin"
  | "auth"
  | "health"
  | "hooks"
  | "store"
  | "webhooks"
  | "other"

type RequestObservationContext = Readonly<{
  backendBuildHash: string
  deploymentId: string
  deploymentSlot: string
  locale: string
  market: string
  originClass: "herbatika-storefront-gateway" | "direct-api"
  releaseSha: string
  requestId: string
  routeClass: ApiRouteClass
}>

export type SafeApiErrorObservation = RequestObservationContext &
  Readonly<{
    errorType: string
    event: "medusa_api_error"
  }>

const requestContexts = new WeakMap<object, RequestObservationContext>()

const safeDeploymentValue = (
  value: string | undefined,
  pattern = SAFE_DEPLOYMENT_VALUE_PATTERN
) => {
  const normalized = value?.trim() ?? ""
  return pattern.test(normalized) ? normalized : "unknown"
}

const firstHeader = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

const classifyRoute = (path: string): ApiRouteClass => {
  const firstSegment = path.split("/", 2)[1]
  if (
    firstSegment === "admin" ||
    firstSegment === "auth" ||
    firstSegment === "hooks" ||
    firstSegment === "store" ||
    firstSegment === "webhooks"
  ) {
    return firstSegment
  }
  return firstSegment === "health" || firstSegment === "healthz"
    ? "health"
    : "other"
}

const resolveRequestId = (req: MedusaRequest): string => {
  const candidate =
    firstHeader(req.headers[REQUEST_ID_HEADER])?.trim().toLowerCase() ?? ""
  return REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID()
}

const resolveLocale = (req: MedusaRequest) => {
  const candidate = firstHeader(req.headers["x-medusa-locale"])?.trim() ?? ""
  return Object.hasOwn(MARKET_BY_LOCALE, candidate) ? candidate : "unknown"
}

const createRequestContext = (
  req: MedusaRequest
): RequestObservationContext => {
  const locale = resolveLocale(req)
  return Object.freeze({
    backendBuildHash: safeDeploymentValue(process.env.BACKEND_BUILD_HASH),
    deploymentId: safeDeploymentValue(process.env.ZANE_DEPLOYMENT_ID),
    deploymentSlot: safeDeploymentValue(
      process.env.ZANE_DEPLOYMENT_SLOT,
      DEPLOYMENT_SLOT_PATTERN
    ),
    locale,
    market:
      locale === "unknown"
        ? "unknown"
        : MARKET_BY_LOCALE[locale as keyof typeof MARKET_BY_LOCALE],
    originClass:
      firstHeader(req.headers["x-herbatika-origin"]) === "storefront-gateway"
        ? "herbatika-storefront-gateway"
        : "direct-api",
    releaseSha: safeDeploymentValue(
      process.env.RELEASE_SHA,
      RELEASE_SHA_PATTERN
    ),
    requestId: resolveRequestId(req),
    routeClass: classifyRoute(req.path ?? req.originalUrl ?? ""),
  })
}

export const requestObservabilityMiddleware = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const context = createRequestContext(req)
  requestContexts.set(req, context)
  res.setHeader(REQUEST_ID_HEADER, context.requestId)
  next()
}

export const buildSafeApiErrorObservation = (
  req: MedusaRequest,
  error: unknown
): SafeApiErrorObservation => {
  const context = requestContexts.get(req) ?? createRequestContext(req)
  const candidate = error instanceof Error ? error.name : "UnknownError"
  const errorType = SAFE_ERROR_TYPES.has(candidate) ? candidate : "Error"
  return { ...context, errorType, event: "medusa_api_error" }
}

export const ensureRequestIdResponseHeader = (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const context = requestContexts.get(req) ?? createRequestContext(req)
  requestContexts.set(req, context)
  if (!res.headersSent) {
    res.setHeader(REQUEST_ID_HEADER, context.requestId)
  }
  return context.requestId
}

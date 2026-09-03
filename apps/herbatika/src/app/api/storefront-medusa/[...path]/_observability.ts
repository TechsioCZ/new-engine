import { randomUUID } from "node:crypto"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"

export const REQUEST_ID_HEADER = "x-request-id"
export const STOREFRONT_ORIGIN_HEADER = "x-herbatika-origin"

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const RELEASE_SHA_PATTERN = /^[0-9a-f]{40}$/
const SAFE_DEPLOYMENT_VALUE_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/
const DEPLOYMENT_SLOT_PATTERN = /^(?:blue|green)$/
const GATEWAY_ROUTE_CLASSES = [
  [
    /^\/store\/(?:products|catalog|collections|product-categories|regions)/,
    "catalog",
  ],
  [/^\/store\/carts(?:\/|$)/, "cart"],
  [
    /^\/store\/(?:payment-collections|payment-providers|shipping-options)/,
    "checkout",
  ],
  [/^\/store\/(?:customers|product-lists)/, "account"],
  [/^\/store\/orders(?:\/|$)/, "orders"],
  [/^\/store\/(?:reviews|claims|external-reviews|shop-reviews)/, "reviews"],
  [/^\/store\/(?:gls|packeta|ppl)/, "logistics"],
] as const

type GatewayRouteClass =
  | "account"
  | "cart"
  | "catalog"
  | "checkout"
  | "logistics"
  | "orders"
  | "reviews"
  | "other"

export type GatewayFailure =
  | "configuration"
  | "upstream_5xx"
  | "upstream_unavailable"
  | "upstream_timeout"

export type GatewayObservation = Readonly<{
  deploymentId: string
  deploymentSlot: string
  event: "storefront_gateway_error"
  failure: GatewayFailure
  locale: string
  market: string
  originClass: "storefront-medusa-gateway"
  releaseSha: string
  requestId: string
  routeClass: GatewayRouteClass
  storefrontBuildHash: string
}>

const safeDeploymentValue = (
  value: string | undefined,
  pattern = SAFE_DEPLOYMENT_VALUE_PATTERN
) => {
  const normalized = value?.trim() ?? ""
  return pattern.test(normalized) ? normalized : "unknown"
}

export const resolveRequestId = (headers: Headers): string => {
  const candidate = headers.get(REQUEST_ID_HEADER)?.trim().toLowerCase() ?? ""
  return REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID()
}

export const withRequestId = (response: Response, requestId: string) => {
  response.headers.set(REQUEST_ID_HEADER, requestId)
  return response
}

export const classifyGatewayRoute = (path: string): GatewayRouteClass =>
  GATEWAY_ROUTE_CLASSES.find(([pattern]) => pattern.test(path))?.[1] ?? "other"

export const buildGatewayObservation = (input: {
  binding?: MarketRuntimeBinding
  failure: GatewayFailure
  path?: string
  requestId: string
}): GatewayObservation => ({
  deploymentId: safeDeploymentValue(process.env.ZANE_DEPLOYMENT_ID),
  deploymentSlot: safeDeploymentValue(
    process.env.ZANE_DEPLOYMENT_SLOT,
    DEPLOYMENT_SLOT_PATTERN
  ),
  event: "storefront_gateway_error",
  failure: input.failure,
  locale: input.binding?.locale ?? "unknown",
  market: input.binding?.market ?? "unknown",
  originClass: "storefront-medusa-gateway",
  releaseSha: safeDeploymentValue(process.env.RELEASE_SHA, RELEASE_SHA_PATTERN),
  requestId: REQUEST_ID_PATTERN.test(input.requestId)
    ? input.requestId
    : "unknown",
  routeClass: classifyGatewayRoute(input.path ?? ""),
  storefrontBuildHash: safeDeploymentValue(process.env.STOREFRONT_BUILD_HASH),
})

export const logGatewayFailure = (
  input: Parameters<typeof buildGatewayObservation>[0]
) => {
  console.error(JSON.stringify(buildGatewayObservation(input)))
}

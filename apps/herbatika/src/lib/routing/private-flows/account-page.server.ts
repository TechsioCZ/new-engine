import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next"
import { getSessionTokenFromCookieHeader } from "@/app/api/storefront-auth/_lib"
import { getMarketRuntime } from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import { ROUTES } from "@/lib/market/market-runtime-definitions"
import {
  type PublicPageProps,
  redirectResult,
  resolveFlowPublicPage,
} from "@/lib/routing/public-page"
import { resolveMedusaBackendUrl } from "@/lib/storefront/runtime-env"
import { buildPath, withPublicSearchParams } from "@/lib/url/public-url"
import { parseMarket } from "@/lib/url/segments"
import type { Market } from "@/lib/url/types"
import type { SourceReadResult } from "@/lib/url-registry/reads"
import type { PrivateCustomerSession } from "./medusa-private-flow-reader"
import { createMedusaPrivateFlowReader } from "./medusa-private-flow-reader"
import { resolvePrivateFlowPublicPage } from "./private-query"

const reader = createMedusaPrivateFlowReader({
  baseUrl: resolveMedusaBackendUrl(),
  fetch,
  resolveMarket: (market) =>
    getMarketRuntime(getConfiguredMarketRuntime(), market),
})

const singleValue = (value: string | string[] | undefined): string | null =>
  typeof value === "string" ? value : null

const trustedMarket = (
  context: GetServerSidePropsContext,
  expectedRouteKey: string
): Market | null => {
  const marketParam = singleValue(context.params?.market)
  const market = marketParam ? parseMarket(marketParam) : null
  if (!market) {
    return null
  }
  const headers = context.req.headers
  return headers["x-sf-market"] === market &&
    headers["x-sf-canonical-origin"] === ROUTES[market].canonicalOrigin &&
    headers["x-sf-route-key"] === expectedRouteKey &&
    typeof headers["x-sf-public-path"] === "string"
    ? market
    : null
}

const unauthenticatedRedirect = <Value>(
  context: GetServerSidePropsContext,
  market: Market
): Promise<GetServerSidePropsResult<PublicPageProps<Value>>> => {
  const currentPublicPath = context.req.headers["x-sf-public-path"]
  return redirectResult<Value>(
    context,
    withPublicSearchParams(
      buildPath({ kind: "account", section: "login" }, market),
      {
        next:
          typeof currentPublicPath === "string" &&
          currentPublicPath.startsWith("/") &&
          !currentPublicPath.startsWith("//")
            ? currentPublicPath
            : buildPath({ kind: "account" }, market),
      }
    ),
    307
  )
}

export const resolveAccountPrivatePage = async <Value>(
  context: GetServerSidePropsContext,
  input: Readonly<{
    expectedRouteKey: string
    loadSource: (
      market: Market,
      session: PrivateCustomerSession
    ) => Promise<SourceReadResult<Value>>
    query?:
      | Readonly<{
          kind: "account-lists"
          path: Readonly<{
            kind: "account"
            section: "lists"
          }>
        }>
      | Readonly<{
          kind: "account-orders"
          path: Readonly<{
            kind: "account"
            section: "orders"
          }>
        }>
    suppressCanonicalization?: boolean
  }>
): Promise<GetServerSidePropsResult<PublicPageProps<Value>>> => {
  const market = trustedMarket(context, input.expectedRouteKey)
  if (!market) {
    return resolveFlowPublicPage(context, {
      expectedRouteKey: input.expectedRouteKey,
      loadSource: async () => ({ kind: "missing" }),
      ...(input.query ? { query: input.query } : {}),
    })
  }

  const token = getSessionTokenFromCookieHeader(
    typeof context.req.headers.cookie === "string"
      ? context.req.headers.cookie
      : null
  )
  const sessionResult = await reader.readSession(market, token)
  if (sessionResult.kind === "unauthenticated") {
    return unauthenticatedRedirect(context, market)
  }

  const loadSource = async (resolvedMarket: Market) =>
    sessionResult.kind === "unavailable"
      ? {
          kind: "unavailable" as const,
          retryAfterSeconds: sessionResult.retryAfterSeconds,
        }
      : input.loadSource(resolvedMarket, sessionResult.session)

  if (input.suppressCanonicalization) {
    return resolvePrivateFlowPublicPage(context, {
      expectedRouteKey: input.expectedRouteKey,
      loadSource,
      suppressCanonicalization: true,
    })
  }

  return resolveFlowPublicPage(context, {
    expectedRouteKey: input.expectedRouteKey,
    loadSource,
    ...(input.query ? { query: input.query } : {}),
  })
}

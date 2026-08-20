import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next"
import { getMarketRuntime } from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import { ROUTES } from "@/lib/market/market-runtime-definitions"
import {
  type PublicPageProps,
  redirectResult,
  resolveFlowPublicPage,
} from "@/lib/routing/public-page"
import { resolveMedusaBackendUrl } from "@/lib/storefront/runtime-env"
import { buildPath } from "@/lib/url/public-url"
import { parseMarket } from "@/lib/url/segments"
import type { Market } from "@/lib/url/types"
import {
  createMedusaTransactionalFlowReader,
  type ReachableCheckoutStep,
} from "./medusa-transactional-flow-reader"
import { readCartSessionId, readCartSessionToken } from "./request-cookies"

const reader = createMedusaTransactionalFlowReader({
  baseUrl: resolveMedusaBackendUrl(),
  fetch,
  resolveMarket: (market) =>
    getMarketRuntime(getConfiguredMarketRuntime(), market),
})

export const transactionalFlowReader = reader

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

export const resolveCheckoutUiPage = async (
  context: GetServerSidePropsContext,
  input: Readonly<{
    expectedRouteKey: string
    requestedStep?: ReachableCheckoutStep
  }>
): Promise<
  GetServerSidePropsResult<
    PublicPageProps<Readonly<{ step: ReachableCheckoutStep }>>
  >
> => {
  const market = trustedMarket(context, input.expectedRouteKey)
  if (!market) {
    return resolveFlowPublicPage(context, {
      expectedRouteKey: input.expectedRouteKey,
      loadSource: async () => ({ kind: "missing" }),
    })
  }
  const cookieHeader =
    typeof context.req.headers.cookie === "string"
      ? context.req.headers.cookie
      : undefined
  const cartId = readCartSessionId(cookieHeader)
  const cartSessionToken = readCartSessionToken(cookieHeader)
  if (!(cartId && cartSessionToken)) {
    return redirectResult(context, buildPath({ kind: "cart" }, market), 307)
  }
  const projection = await reader.readCheckoutSession(
    market,
    cartId,
    cartSessionToken
  )
  if (projection.kind === "missing") {
    return redirectResult(context, buildPath({ kind: "cart" }, market), 307)
  }
  if (projection.kind === "invalid-provider") {
    return resolveFlowPublicPage(context, {
      expectedRouteKey: input.expectedRouteKey,
      loadSource: async () => ({ kind: "missing" }),
    })
  }
  if (projection.kind !== "found") {
    return resolveFlowPublicPage(context, {
      expectedRouteKey: input.expectedRouteKey,
      loadSource: async () => projection,
    })
  }
  const requestedStep = input.requestedStep
  if (
    !(requestedStep && projection.value.reachableSteps.includes(requestedStep))
  ) {
    return redirectResult(
      context,
      buildPath(
        {
          kind: "checkout",
          step: projection.value.defaultStep,
        },
        market
      ),
      307
    )
  }
  return resolveFlowPublicPage(context, {
    expectedRouteKey: input.expectedRouteKey,
    loadSource: async () => ({
      kind: "found",
      value: { step: requestedStep },
    }),
  })
}

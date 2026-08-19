import "server-only"

import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { cache } from "react"
import {
  type HerbatikaMarketContext,
  resolveHostMarketContext,
  resolveMarketRequestHost,
} from "./market-context"

type HeaderReader = Pick<Headers, "get">

const resolveBooleanEnvironmentValue = (value: string | undefined): boolean =>
  ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase() ?? "")

export const resolveMarketContextFromHeaders = (
  headerStore: HeaderReader
): HerbatikaMarketContext | null => {
  const trustProxyHost = resolveBooleanEnvironmentValue(
    process.env.STOREFRONT_TRUST_PROXY_HOST
  )
  const host = resolveMarketRequestHost({
    forwardedHost: headerStore.get("x-forwarded-host"),
    host: headerStore.get("host"),
    trustProxyHost,
  })

  return resolveHostMarketContext({
    allowDevelopmentFallback: process.env.NODE_ENV !== "production",
    host,
    hostAliases: {
      sk: process.env.STOREFRONT_MARKET_HOST_ALIASES_SK,
      cz: process.env.STOREFRONT_MARKET_HOST_ALIASES_CZ,
      hu: process.env.STOREFRONT_MARKET_HOST_ALIASES_HU,
      ro: process.env.STOREFRONT_MARKET_HOST_ALIASES_RO,
    },
  })
}

export const getMarketServerContext = cache(async () => {
  const marketContext = resolveMarketContextFromHeaders(await headers())

  if (!marketContext) {
    notFound()
  }

  return marketContext
})

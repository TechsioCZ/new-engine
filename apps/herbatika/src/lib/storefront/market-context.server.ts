import "server-only"

import { headers } from "next/headers"
import { cache } from "react"
import {
  resolveMarketContext,
  resolveMarketRequestHost,
} from "./market-context"

export const getMarketServerContext = cache(async () => {
  const headerStore = await headers()

  return resolveMarketContext({
    acceptLanguage: headerStore.get("accept-language"),
    host: resolveMarketRequestHost({
      forwardedHost: headerStore.get("x-forwarded-host"),
      host: headerStore.get("host"),
    }),
  })
})

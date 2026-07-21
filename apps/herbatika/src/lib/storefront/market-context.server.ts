import "server-only"

import { headers } from "next/headers"
import { cache } from "react"
import { resolveMarketContext } from "./market-context"

export const getMarketServerContext = cache(async () => {
  const headerStore = await headers()

  return resolveMarketContext({
    acceptLanguage: headerStore.get("accept-language"),
    host:
      headerStore.get("x-forwarded-host") ??
      headerStore.get("host") ??
      undefined,
  })
})

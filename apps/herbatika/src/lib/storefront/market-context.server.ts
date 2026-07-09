import "server-only"

import { headers } from "next/headers"
import { resolveMarketContext } from "./market-context"

export const getMarketServerContext = async () => {
  const headerStore = await headers()

  return resolveMarketContext({
    acceptLanguage: headerStore.get("accept-language"),
    host:
      headerStore.get("x-forwarded-host") ??
      headerStore.get("host") ??
      undefined,
  })
}

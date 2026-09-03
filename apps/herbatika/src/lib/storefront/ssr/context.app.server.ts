import "server-only"

import { getMarketServerContext } from "../market-context.server"
import { getRegionServerContext } from "./context"

/** App Router adapter. Pages SSR must pass its trusted market explicitly. */
export const getAppRegionServerContext = async () => {
  const marketContext = await getMarketServerContext()
  return getRegionServerContext({ market: marketContext.code })
}

import "server-only"

import { createMarketRuntime } from "./market-runtime"

export const MARKET_RUNTIME = createMarketRuntime(process.env)

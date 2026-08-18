import "server-only"

import { createMedusaSdk } from "@techsio/storefront-data/shared/medusa-client"
import { resolveMarketRuntimeByHost } from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import { resolveMedusaBackendUrl } from "./runtime-env"
import { handleVolumeDiscountGatewayRequest } from "./volume-discounts-gateway"
import { createVolumeDiscountMedusaReader } from "./volume-discounts-medusa-reader"

const readVolumeDiscounts = createVolumeDiscountMedusaReader({
  baseUrl: resolveMedusaBackendUrl(),
  createClient: ({ baseUrl, publishableKey }) => {
    const sdk = createMedusaSdk({ baseUrl, publishableKey })
    return {
      fetch: (path, options) => sdk.client.fetch<unknown>(path, options),
    }
  },
})

export const handleVolumeDiscountGatewayFromMedusa = (
  request: Request,
  authToken: string | null
) =>
  handleVolumeDiscountGatewayRequest(request, {
    authToken,
    readVolumeDiscounts,
    resolveMarket: (host) =>
      resolveMarketRuntimeByHost(getConfiguredMarketRuntime(), host),
  })

import "server-only"

import { createMedusaSdk } from "@techsio/storefront-data/shared/medusa-client"
import { resolveMarketRuntimeByHost } from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import { handleProductLocationAvailabilityGatewayRequest } from "./product-location-availability-gateway"
import { createProductLocationAvailabilityMedusaReader } from "./product-location-availability-medusa-reader"
import { resolveMedusaBackendUrl } from "./runtime-env"

const readProductLocationAvailability =
  createProductLocationAvailabilityMedusaReader({
    baseUrl: resolveMedusaBackendUrl(),
    createClient: ({ baseUrl, publishableKey }) => {
      const sdk = createMedusaSdk({ baseUrl, publishableKey })
      return {
        fetch: (path, options) => sdk.client.fetch<unknown>(path, options),
      }
    },
  })

export const handleProductLocationAvailabilityGatewayFromMedusa = (
  request: Request
) =>
  handleProductLocationAvailabilityGatewayRequest(request, {
    readProductLocationAvailability,
    resolveMarket: (host) =>
      resolveMarketRuntimeByHost(getConfiguredMarketRuntime(), host),
  })

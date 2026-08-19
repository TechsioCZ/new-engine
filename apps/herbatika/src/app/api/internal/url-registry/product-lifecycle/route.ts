import "server-only"
import { getMarketRuntime } from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import { handleProductLifecycleRequest } from "@/lib/url-registry/http/product-lifecycle-endpoint"
import { getUrlRegistryRuntime } from "@/lib/url-registry/runtime/instance.server"

export const runtime = "nodejs"

export function POST(request: Request) {
  return handleProductLifecycleRequest(request, {
    enabled:
      process.env.URL_REGISTRY_ENABLED === "1" &&
      process.env.URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED === "1",
    lifecycleToken: process.env.URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN,
    expectedSalesChannelId: (market) =>
      getMarketRuntime(getConfiguredMarketRuntime(), market)?.salesChannelId ??
      null,
    consume: async (delivery) => {
      const urlRegistryRuntime = await getUrlRegistryRuntime()
      if (!urlRegistryRuntime.enabled) {
        throw new Error("URL registry runtime is disabled")
      }
      return urlRegistryRuntime.productLifecycleConsumer.consume(delivery)
    },
  })
}

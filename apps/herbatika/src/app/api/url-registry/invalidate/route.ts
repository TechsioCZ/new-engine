import "server-only"
import { resolveMarketRuntimeByHost } from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import { consumeUrlRegistryInvalidation } from "@/lib/url-registry/runtime/invalidation.server"
import { handleUrlRegistryInvalidationRequest } from "@/lib/url-registry/runtime/invalidation-endpoint"

export const runtime = "nodejs"

export function POST(request: Request) {
  return handleUrlRegistryInvalidationRequest(request, {
    consume: consumeUrlRegistryInvalidation,
    enabled:
      process.env.URL_REGISTRY_ENABLED === "1" &&
      process.env.URL_REGISTRY_INVALIDATION_ENABLED === "1",
    isExpectedHost: (host) =>
      resolveMarketRuntimeByHost(getConfiguredMarketRuntime(), host) !== null,
    token: process.env.URL_REGISTRY_INVALIDATION_TOKEN,
  })
}

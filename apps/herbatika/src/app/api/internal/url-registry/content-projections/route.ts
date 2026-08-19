import "server-only"
import { handleContentProjectionRequest } from "@/lib/url-registry/http/content-projection-endpoint"
import { getUrlRegistryRuntime } from "@/lib/url-registry/runtime/instance.server"

export const runtime = "nodejs"

export function POST(request: Request) {
  return handleContentProjectionRequest(request, {
    enabled:
      process.env.URL_REGISTRY_ENABLED === "1" &&
      process.env.URL_REGISTRY_CONTENT_PROJECTION_ENABLED === "1",
    projectionToken: process.env.URL_REGISTRY_CONTENT_PROJECTION_TOKEN,
    readRegistry: async () => {
      const registryRuntime = await getUrlRegistryRuntime()
      if (!registryRuntime.enabled) {
        throw new Error("URL registry runtime is disabled")
      }
      return registryRuntime.registry
    },
  })
}

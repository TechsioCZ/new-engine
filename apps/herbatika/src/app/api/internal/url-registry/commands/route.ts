import { handleUrlRegistryCommandRequest } from "@/lib/url-registry/http/command-endpoint"
import { getUrlRegistryRuntime } from "@/lib/url-registry/runtime/instance.server"

export const runtime = "nodejs"

export function POST(request: Request) {
  return handleUrlRegistryCommandRequest(request, {
    commandToken: process.env.URL_REGISTRY_ADMIN_TOKEN,
    enabled:
      process.env.URL_REGISTRY_ENABLED === "1" &&
      process.env.URL_REGISTRY_COMMANDS_ENABLED === "1",
    readRegistry: async () => {
      const registryRuntime = await getUrlRegistryRuntime()
      if (!registryRuntime.enabled) {
        throw new Error("URL registry runtime is disabled")
      }
      return registryRuntime.registry
    },
  })
}

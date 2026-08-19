import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import {
  SYSTEM_NO_STORE,
  systemHostFailureResponse,
  systemOptionsResponse,
} from "@/lib/seo/system-response"
import {
  checkUrlRegistryHealth,
  resolveSystemHostFromRequest,
} from "@/lib/seo/system-runtime.server"

export const dynamic = "force-dynamic"

const response = (body: Readonly<Record<string, unknown>>, status: number) =>
  Response.json(body, {
    headers: {
      "cache-control": SYSTEM_NO_STORE,
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    },
    status,
  })

export const GET = async (request: Request): Promise<Response> => {
  const resolution = resolveSystemHostFromRequest(request)
  if (resolution.kind !== "found") {
    return systemHostFailureResponse(resolution)
  }
  try {
    const runtime = getConfiguredMarketRuntime()
    const checks = await Promise.all(
      runtime.allowedMarkets.map(async (market) => {
        const binding = runtime.bindings[market]
        return Boolean(binding && (await checkUrlRegistryHealth(binding)))
      })
    )
    return checks.length > 0 && checks.every(Boolean)
      ? response({ status: "ok" }, 200)
      : response({ status: "unavailable" }, 503)
  } catch {
    return response({ status: "unavailable" }, 503)
  }
}

export const HEAD = async (request: Request): Promise<Response> => {
  const getResponse = await GET(request)
  return new Response(null, {
    headers: getResponse.headers,
    status: getResponse.status,
  })
}

export const OPTIONS = systemOptionsResponse

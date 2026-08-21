import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import {
  SYSTEM_NO_STORE,
  systemHostFailureResponse,
} from "@/lib/seo/system-response"
import {
  checkUrlRegistryHealth,
  resolveSystemHostFromRequest,
} from "@/lib/seo/system-runtime.server"
import { verifyBearerAuthorization } from "@/lib/url-registry/http/command-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const FOUR_MARKETS = ["sk", "cz", "hu", "ro"] as const

const response = (body: Readonly<Record<string, unknown>>, status: number) =>
  Response.json(body, {
    headers: {
      "cache-control": SYSTEM_NO_STORE,
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    },
    status,
  })

export const GET = (request: Request): Response => {
  const resolution = resolveSystemHostFromRequest(request)
  if (resolution.kind !== "found") {
    return systemHostFailureResponse(resolution)
  }

  return response({ status: "ok" }, 200)
}

export const POST = async (request: Request): Promise<Response> => {
  const resolution = resolveSystemHostFromRequest(request)
  if (resolution.kind !== "found") {
    return systemHostFailureResponse(resolution)
  }

  const authorization = verifyBearerAuthorization(
    request.headers.get("authorization"),
    process.env.HERBATIKA_READINESS_TOKEN
  )
  if (authorization === "misconfigured") {
    return response({ status: "unavailable" }, 503)
  }
  if (authorization !== "authorized") {
    return response({ status: "unauthorized" }, 401)
  }

  try {
    const configuredRuntime = getConfiguredMarketRuntime()
    const configuredMarkets = new Set(configuredRuntime.allowedMarkets)
    const checks = await Promise.all(
      FOUR_MARKETS.map(async (market) => {
        const binding = configuredRuntime.bindings[market]
        if (!(configuredMarkets.has(market) && binding)) {
          return [market, { status: "unavailable" }] as const
        }

        try {
          return [
            market,
            {
              status: (await checkUrlRegistryHealth(binding))
                ? "ok"
                : "unavailable",
            },
          ] as const
        } catch {
          return [market, { status: "unavailable" }] as const
        }
      })
    )
    const markets = Object.fromEntries(checks)
    const ready = checks.every(([, check]) => check.status === "ok")
    return response(
      { markets, status: ready ? "ok" : "unavailable" },
      ready ? 200 : 503
    )
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

export const OPTIONS = (): Response =>
  new Response(null, {
    headers: {
      allow: "GET, HEAD, POST",
      "cache-control": SYSTEM_NO_STORE,
    },
    status: 204,
  })

import "server-only"

import { resolveConfiguredMarketRuntimeBindingByHost } from "@/lib/market/market-runtime.server"
import { readAvailablePublicEntitySlugs } from "@/lib/storefront/ssr/public-entity-projections"
import {
  isValidProductSourceId,
  PRODUCT_PUBLIC_SLUGS_MAX_IDS,
  type ProductPublicSlugsResponse,
} from "./product-public-slugs-contract"

const RESPONSE_HEADERS = {
  "cache-control": "public, max-age=300, stale-while-revalidate=3600",
  vary: "Host",
} as const

const errorResponse = (message: string, status: number) =>
  Response.json(
    { message },
    {
      headers: { "cache-control": "private, no-store, max-age=0" },
      status,
    }
  )

const readRequestedIds = (request: Request): readonly string[] | null => {
  const entries = Array.from(new URL(request.url).searchParams.entries())
  if (entries.length !== 1 || entries[0]?.[0] !== "ids") {
    return null
  }
  const ids = [...new Set(entries[0][1].split(","))]
  if (ids.length === 0 || ids.length > PRODUCT_PUBLIC_SLUGS_MAX_IDS) {
    return null
  }
  return ids.every(isValidProductSourceId) ? ids : null
}

export const handleProductPublicSlugsRequest = async (
  request: Request
): Promise<Response> => {
  const binding = resolveConfiguredMarketRuntimeBindingByHost(
    request.headers.get("host")
  )
  if (!binding) {
    return errorResponse("Misdirected request.", 421)
  }

  const ids = readRequestedIds(request)
  if (!ids) {
    return errorResponse("Invalid product public slugs request.", 400)
  }

  if (process.env.URL_ARCHITECTURE_ENABLED !== "1") {
    // Registry-free deployments serve Medusa handles as public slugs; the
    // client falls back to product handles when it sees this mode.
    const response: ProductPublicSlugsResponse = {
      mode: "handles",
      slugs_by_id: {},
    }
    return Response.json(response, { headers: RESPONSE_HEADERS, status: 200 })
  }

  const projections = await readAvailablePublicEntitySlugs({
    kind: "product",
    market: binding.market,
    requiredSourceIds: ids,
  })
  if (projections.kind !== "found") {
    return errorResponse(
      "Product public slugs are temporarily unavailable.",
      503
    )
  }

  const response: ProductPublicSlugsResponse = {
    mode: "registry",
    slugs_by_id: projections.value,
  }
  return Response.json(response, { headers: RESPONSE_HEADERS, status: 200 })
}

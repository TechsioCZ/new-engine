import { APIError, type Endpoint } from "payload"
import { buildJsonResponse, getQueryParam } from "../utils/endpoint"

type MedusaStoreProduct = {
  id?: string
  title?: string | null
  handle?: string | null
  thumbnail?: string | null
}

type MedusaStoreProductsResponse = {
  products?: MedusaStoreProduct[]
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const TRAILING_SLASH_REGEX = /\/$/

const resolveMedusaBackendUrl = () =>
  (process.env.MEDUSA_BACKEND_URL || "http://medusa-be:9000").replace(
    TRAILING_SLASH_REGEX,
    ""
  )

const resolvePublishableKey = () =>
  process.env.PAYLOAD_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  ""

const parseLimit = (value: string | undefined) => {
  const parsed = Number.parseInt(value || "", 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT
  }

  return Math.min(parsed, MAX_LIMIT)
}

const isAuthorized = (req: Parameters<Endpoint["handler"]>[0]) => {
  if (req.user) {
    return true
  }

  const apiKey = process.env.PAYLOAD_API_KEY
  return Boolean(apiKey && req.headers.get("x-payload-api-key") === apiKey)
}

const fetchProducts = async ({
  search,
  limit,
  signal,
}: {
  search?: string
  limit: number
  signal?: AbortSignal
}) => {
  const publishableKey = resolvePublishableKey()
  if (!publishableKey) {
    throw new APIError("Missing Medusa publishable key for product picker", 500)
  }

  const url = new URL("/store/products", resolveMedusaBackendUrl())
  url.searchParams.set("limit", String(limit))
  url.searchParams.set("fields", "id,handle,title,thumbnail")
  if (search) {
    url.searchParams.set("q", search)
  }

  const response = await fetch(url, {
    headers: {
      "x-publishable-api-key": publishableKey,
    },
    signal,
  })

  if (!response.ok) {
    throw new APIError(
      `Medusa product lookup failed with status ${response.status}`,
      502
    )
  }

  const data = (await response.json()) as MedusaStoreProductsResponse
  return (data.products || [])
    .filter((product) => product.handle)
    .map((product) => ({
      id: product.id,
      slug: product.handle || "",
      title: product.title || product.handle || "Untitled product",
      thumbnail: product.thumbnail || null,
    }))
}

/** Product lookup endpoint used by Payload admin custom fields. */
export const medusaProductsEndpoint: Endpoint = {
  path: "/medusa-products",
  method: "get",
  handler: async (req) => {
    if (!isAuthorized(req)) {
      throw new APIError("Unauthorized", 401)
    }

    const search = getQueryParam(req, "search")?.trim()
    const limit = parseLimit(getQueryParam(req, "limit"))
    const products = await fetchProducts({
      search,
      limit,
      signal: req.signal instanceof AbortSignal ? req.signal : undefined,
    })

    return buildJsonResponse(req, { products })
  },
}

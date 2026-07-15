import { APIError, type Endpoint } from "payload"
import {
  buildJsonResponse,
  getQueryParam,
  isAuthorizedEndpointRequest,
  parseLimit,
} from "../utils/endpoint"

type MedusaStoreProduct = {
  id?: string
  title?: string | null
  handle?: string | null
  thumbnail?: string | null
}

type MedusaStoreProductsResponse = {
  products?: MedusaStoreProduct[]
}

const TRAILING_SLASH_REGEX = /\/$/
const PRODUCT_FETCH_TIMEOUT_MS = 10_000

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

const isAbortSignal = (value: unknown): value is AbortSignal =>
  typeof AbortSignal !== "undefined" && value instanceof AbortSignal

const createTimeoutSignal = (timeoutMs: number) => {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs).unref?.()
  return controller.signal
}

const resolveFetchSignal = (signal: unknown) =>
  isAbortSignal(signal) ? signal : createTimeoutSignal(PRODUCT_FETCH_TIMEOUT_MS)

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
    signal: resolveFetchSignal(signal),
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
    if (!isAuthorizedEndpointRequest(req)) {
      throw new APIError("Unauthorized", 401)
    }

    const search = getQueryParam(req, "search")?.trim()
    const limit = parseLimit(getQueryParam(req, "limit"))
    const products = await fetchProducts({
      search,
      limit,
      signal: resolveFetchSignal(req.signal),
    })

    return buildJsonResponse(req, { products })
  },
}

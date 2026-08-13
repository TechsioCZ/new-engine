import { APIError, type Endpoint } from "payload"
import {
  buildJsonResponse,
  getQueryParam,
  isAuthorizedEndpointRequest,
  parseLimit,
} from "../utils/endpoint"

type MedusaStoreProduct = {
  external_id?: string | null
  metadata?: {
    source_shopitem_id?: unknown
  } | null
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

const resolveProductExternalId = (product: MedusaStoreProduct) => {
  if (product.external_id?.trim()) {
    return product.external_id.trim()
  }

  const sourceId = product.metadata?.source_shopitem_id
  return typeof sourceId === "string" && sourceId.trim()
    ? sourceId.trim()
    : null
}

const isAbortSignal = (value: unknown): value is AbortSignal =>
  typeof AbortSignal !== "undefined" && value instanceof AbortSignal

const resolveFetchSignal = (signal: unknown) => {
  const timeoutSignal = AbortSignal.timeout(PRODUCT_FETCH_TIMEOUT_MS)
  if (!isAbortSignal(signal)) {
    return timeoutSignal
  }

  return AbortSignal.any([signal, timeoutSignal])
}

const fetchProducts = async ({
  externalId,
  handle,
  search,
  limit,
  signal,
}: {
  externalId?: string
  handle?: string
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
  url.searchParams.set(
    "fields",
    "id,external_id,handle,title,thumbnail,+metadata"
  )
  if (search) {
    url.searchParams.set("q", search)
  }
  if (externalId) {
    url.searchParams.set("external_id", externalId)
  }
  if (handle) {
    url.searchParams.set("handle", handle)
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
    .flatMap((product) => {
      const externalId = resolveProductExternalId(product)
      if (!externalId) {
        return []
      }

      return [
        {
          externalId,
          handle: product.handle || undefined,
          id: product.id,
          title:
            product.title ||
            product.handle ||
            `Product ${externalId}`,
          thumbnail: product.thumbnail || null,
        },
      ]
    })
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
    const externalId = getQueryParam(req, "externalId")?.trim()
    const limit = parseLimit(getQueryParam(req, "limit"))
    let products = await fetchProducts({
      externalId,
      search,
      limit,
      signal: isAbortSignal(req.signal) ? req.signal : undefined,
    })
    if (externalId && products.length === 0) {
      products = (
        await fetchProducts({
          handle: `shopitem-${externalId}`,
          limit: 1,
          signal: isAbortSignal(req.signal) ? req.signal : undefined,
        })
      ).filter((product) => product.externalId === externalId)
    }

    return buildJsonResponse(req, { products })
  },
}

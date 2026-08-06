import { assertServerOnly } from "@/lib/server-guard"

import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
  SSR_FETCH_OPTIONS,
} from "@/lib/storefront/ssr/constants"
import { normalizeStorefrontBrand, type StorefrontBrand } from "./brands"

assertServerOnly("storefront/brands.server")

type StoreBrandPayload = {
  id?: string | null
  title?: string | null
  handle?: string | null
}

const STORE_BRANDS_INDEX_LIMIT = 500
const INVALID_BRANDS_RESPONSE_MESSAGE = "Invalid Medusa brands response"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const readNullableString = (
  input: Record<string, unknown>,
  field: keyof StoreBrandPayload
): string | null | undefined => {
  const value = input[field]

  if (value === undefined || value === null || typeof value === "string") {
    return value
  }

  throw new Error(INVALID_BRANDS_RESPONSE_MESSAGE)
}

const parseStorefrontBrands = (payload: unknown): StorefrontBrand[] => {
  if (!(isRecord(payload) && Array.isArray(payload.brands))) {
    throw new Error(INVALID_BRANDS_RESPONSE_MESSAGE)
  }

  return payload.brands.map((input) => {
    if (!isRecord(input)) {
      throw new Error(INVALID_BRANDS_RESPONSE_MESSAGE)
    }

    const brand = normalizeStorefrontBrand({
      id: readNullableString(input, "id"),
      title: readNullableString(input, "title"),
      handle: readNullableString(input, "handle"),
    })

    if (!brand) {
      throw new Error(INVALID_BRANDS_RESPONSE_MESSAGE)
    }

    return brand
  })
}

export const fetchStorefrontBrands = async (): Promise<StorefrontBrand[]> => {
  const url = new URL("/store/brands", MEDUSA_BACKEND_URL)
  url.searchParams.set("limit", String(STORE_BRANDS_INDEX_LIMIT))
  url.searchParams.set("offset", "0")
  url.searchParams.set("order", "title")
  url.searchParams.set("fields", "id,title,handle")

  const response = await fetch(url, {
    ...SSR_FETCH_OPTIONS.static,
    headers: {
      "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load storefront brands: ${response.status}`)
  }

  const brands = parseStorefrontBrands(await response.json())

  const brandsBySlug = new Map<string, StorefrontBrand>()
  for (const brand of brands) {
    if (!brandsBySlug.has(brand.slug)) {
      brandsBySlug.set(brand.slug, brand)
    }
  }

  return Array.from(brandsBySlug.values())
}

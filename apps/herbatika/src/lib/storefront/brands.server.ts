// Pages Router rejects the App-Router-only `server-only` marker. Keep this
// module reachable only from server entry points.

import { getMarketRuntime } from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import {
  MEDUSA_BACKEND_URL,
  SSR_FETCH_OPTIONS,
} from "@/lib/storefront/ssr/constants"
import type { Market } from "@/lib/url/types"
import { normalizeStorefrontBrand, type StorefrontBrand } from "./brands"

type StoreBrandsResponse = {
  brands?: Array<{
    id?: string | null
    title?: string | null
    handle?: string | null
  }>
}

const STORE_BRANDS_INDEX_LIMIT = 500

export const fetchStorefrontBrands = async (
  market: Market
): Promise<StorefrontBrand[]> => {
  const binding = getMarketRuntime(getConfiguredMarketRuntime(), market)
  if (!binding) {
    throw new Error(`Missing runtime market binding for ${market}`)
  }
  const url = new URL("/store/brands", MEDUSA_BACKEND_URL)
  url.searchParams.set("limit", String(STORE_BRANDS_INDEX_LIMIT))
  url.searchParams.set("offset", "0")
  url.searchParams.set("order", "title")
  url.searchParams.set("fields", "id,title,handle")
  url.searchParams.set("locale", binding.locale)

  const response = await fetch(url, {
    ...SSR_FETCH_OPTIONS.static,
    headers: {
      "x-publishable-api-key": binding.publishableApiKey,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load storefront brands: ${response.status}`)
  }

  const data = (await response.json()) as StoreBrandsResponse
  const brands = (data.brands ?? [])
    .map((brand) => normalizeStorefrontBrand(brand))
    .filter((brand): brand is StorefrontBrand => Boolean(brand))

  const brandsById = new Map<string, StorefrontBrand>()
  for (const brand of brands) {
    if (!brandsById.has(brand.id)) {
      brandsById.set(brand.id, brand)
    }
  }

  return Array.from(brandsById.values())
}

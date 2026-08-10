import "server-only"
import { isRecord, getRecordValue } from "@techsio/std/object"

import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
  SSR_FETCH_OPTIONS,
} from "@/lib/storefront/ssr/constants"

import { normalizeStorefrontBrand } from "./brands"
import type { StorefrontBrand } from "./brands"

const STORE_BRANDS_INDEX_LIMIT = 500

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

  const data: unknown = await response.json()
  const brandsValue = isRecord(data) ? getRecordValue(data, "brands") : null
  const rawBrands = Array.isArray(brandsValue) ? brandsValue : []
  const brands: StorefrontBrand[] = []

  for (const rawBrand of rawBrands) {
    if (!isRecord(rawBrand)) {
      continue
    }

    const handle = getRecordValue(rawBrand, "handle")
    const id = getRecordValue(rawBrand, "id")
    const title = getRecordValue(rawBrand, "title")
    const brand = normalizeStorefrontBrand({
      handle: typeof handle === "string" ? handle : null,
      id: typeof id === "string" ? id : null,
      title: typeof title === "string" ? title : null,
    })
    if (brand !== null) {
      brands.push(brand)
    }
  }

  const brandsBySlug = new Map<string, StorefrontBrand>()
  for (const brand of brands) {
    if (!brandsBySlug.has(brand.slug)) {
      brandsBySlug.set(brand.slug, brand)
    }
  }

  return [...brandsBySlug.values()]
}

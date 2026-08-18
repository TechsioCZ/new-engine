import { ROUTES } from "@/lib/market/market-runtime-definitions"
import { ROUTE_SEGMENT_REGISTRY } from "./segments"
import { validatePublishedSlug } from "./slug"
import type { Market } from "./types"

export const buildProductPath = (
  market: Market,
  publicSlug: string
): string => {
  validatePublishedSlug(publicSlug)
  const prefix = ROUTE_SEGMENT_REGISTRY[market].typePrefixes.products
  return `/${prefix}/${publicSlug}`
}

export const buildProductAbsoluteUrl = (
  market: Market,
  publicSlug: string,
  rawQuery = ""
): string => {
  const url = new URL(
    buildProductPath(market, publicSlug),
    ROUTES[market].canonicalOrigin
  )
  url.search = rawQuery
  return url.toString()
}

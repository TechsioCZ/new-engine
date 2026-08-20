import {
  buildAbsoluteUrl,
  buildPath,
  withPublicSearchParams,
} from "./public-url"
import type { Market } from "./types"

export const buildProductPath = (market: Market, publicSlug: string): string =>
  buildPath({ kind: "product", slug: publicSlug }, market)

export const buildProductAbsoluteUrl = (
  market: Market,
  publicSlug: string,
  searchParams: Readonly<
    Record<string, string | number | null | undefined>
  > = {}
): string => {
  const pathname = withPublicSearchParams(
    buildProductPath(market, publicSlug),
    searchParams
  )
  return new URL(
    pathname,
    buildAbsoluteUrl({ kind: "home" }, market)
  ).toString()
}

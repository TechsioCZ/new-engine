"use client"

import { buildSearchUrl } from "@/lib/url/builder"
import type { Market } from "@/lib/url/types"
import { parseAsInteger, parseAsString } from "nuqs"

export const SEARCH_RESULT_LIMIT = 24

export const searchQueryParsers = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
}

export const normalizePage = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 1
  }

  const normalizedPage = Math.trunc(value)
  if (normalizedPage < 1) {
    return 1
  }

  return normalizedPage
}

export const normalizeSearchQuery = (value: unknown): string => {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

export const resolveSearchHref = (market: Market, value: unknown): string => {
  const query = normalizeSearchQuery(value)
  return buildSearchUrl(market, query || undefined)
}

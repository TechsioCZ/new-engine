"use client"

import { parseAsInteger, parseAsString } from "nuqs"
import { buildPath } from "@/lib/url/public-url"
import type { Market } from "@/lib/url/types"

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

export const resolveSearchHref = (value: unknown, market: Market): string => {
  const query = normalizeSearchQuery(value)
  return buildPath(
    query ? { kind: "search", query } : { kind: "search" },
    market
  )
}

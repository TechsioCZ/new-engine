import { createSerializer } from "nuqs"
import {
  parseAsCategoryId,
  parseAsPositivePageWithDefault,
  parseAsSearchQuery,
} from "./parsers"

type MaybeString = string | null | undefined
type MaybeNumber = number | null | undefined

export const SEARCH_ROUTE = "/vyhledavani"

export const searchUrlParsers = {
  q: parseAsSearchQuery.withDefault(""),
  page: parseAsPositivePageWithDefault,
  category_id: parseAsCategoryId.withDefault(""),
} as const

const serializeSearchUrl = createSerializer(searchUrlParsers)

export function normalizeSearchQuery(value: MaybeString): string {
  return typeof value === "string" ? value.trim() : ""
}

export function normalizeCategoryId(value: MaybeString): string {
  return typeof value === "string" ? value.trim() : ""
}

export function normalizeSearchPage(value: MaybeNumber): number {
  if (!(typeof value === "number" && Number.isFinite(value) && value > 0)) {
    return 1
  }

  return Math.floor(value)
}

export function toSearchQueryParam(
  value: MaybeString
): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  const normalized = normalizeSearchQuery(value)
  return normalized || null
}

export function toCategoryIdQueryParam(
  value: MaybeString
): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  const normalized = normalizeCategoryId(value)
  return normalized || null
}

export function toPageQueryParam(
  value: MaybeNumber
): number | null | undefined {
  if (value === undefined) {
    return undefined
  }

  const normalized = normalizeSearchPage(value)
  return normalized > 1 ? normalized : null
}

type SearchHrefParams = {
  q?: MaybeString
  page?: MaybeNumber
  category_id?: MaybeString
}

export function buildSearchHref(params: SearchHrefParams = {}): string {
  return serializeSearchUrl(SEARCH_ROUTE, {
    q: toSearchQueryParam(params.q),
    page: toPageQueryParam(params.page),
    category_id: toCategoryIdQueryParam(params.category_id),
  })
}

import type { PageUrlDetails as PaginationPageUrlDetails } from "@zag-js/pagination"

type PaginationSearchParamValue = string | number | boolean | null | undefined
type PaginationSearchParamsRecord = Record<string, PaginationSearchParamValue>

export type PaginationGetPageUrl = (details: PaginationPageUrlDetails) => string

export type PaginationSearchParamsInput =
  | string
  | URLSearchParams
  | { toString: () => string }

export interface CreatePaginationGetPageUrlOptions {
  pathname: string
  searchParams?: PaginationSearchParamsInput | undefined
  pageParam?: string | undefined
  defaultPage?: number | undefined
  searchParamOverrides?: PaginationSearchParamsRecord | undefined
}

const toURLSearchParams = (
  searchParams?: PaginationSearchParamsInput,
): URLSearchParams => {
  if (searchParams === undefined || searchParams === "") {
    return new URLSearchParams()
  }

  if (typeof searchParams === "string") {
    return new URLSearchParams(searchParams)
  }

  return new URLSearchParams(searchParams.toString())
}

export const createPaginationGetPageUrl = ({
  pathname,
  searchParams,
  pageParam = "page",
  defaultPage = 1,
  searchParamOverrides,
}: CreatePaginationGetPageUrlOptions): PaginationGetPageUrl => {
  const baseSearchParams = toURLSearchParams(searchParams)

  return ({ page }) => {
    const nextSearchParams = new URLSearchParams(baseSearchParams)

    if (searchParamOverrides !== undefined) {
      for (const [key, value] of Object.entries(searchParamOverrides)) {
        if (value === null || value === undefined) {
          nextSearchParams.delete(key)
        } else {
          nextSearchParams.set(key, String(value))
        }
      }
    }

    if (page === defaultPage) {
      nextSearchParams.delete(pageParam)
    } else {
      nextSearchParams.set(pageParam, page.toString())
    }

    const query = nextSearchParams.toString()
    return query.length > 0 ? `${pathname}?${query}` : pathname
  }
}

type MaybeString = string | null | undefined
type MaybeNumber = number | null | undefined

export interface ProductsPageRange {
  start: number
  end: number
  isRange: boolean
}

export const PRODUCTS_ROUTE = "/products"

export const DEFAULT_PRODUCTS_PAGE_RANGE: ProductsPageRange = {
  start: 1,
  end: 1,
  isRange: false,
}

function toPositiveInt(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null
  }

  return Math.floor(parsed)
}

export function parseProductsPageRange(
  value: string | null | undefined
): ProductsPageRange | null {
  if (!value) {
    return null
  }

  const normalizedValue = value.trim()
  if (!normalizedValue) {
    return null
  }

  if (normalizedValue.includes("-")) {
    const parts = normalizedValue.split("-")
    if (parts.length !== 2) {
      return null
    }

    const [startRaw, endRaw] = parts
    const start = toPositiveInt(startRaw)
    const end = toPositiveInt(endRaw)

    if (!start || !end || start > end) {
      return null
    }

    return {
      start,
      end,
      isRange: start !== end,
    }
  }

  const page = toPositiveInt(normalizedValue)
  if (!page) {
    return null
  }

  return {
    start: page,
    end: page,
    isRange: false,
  }
}

export function serializeProductsPageRange(value: ProductsPageRange): string {
  const start = Math.max(1, Math.floor(value.start))
  const end = Math.max(start, Math.floor(value.end))

  if (start === end) {
    return String(start)
  }

  return `${start}-${end}`
}

export function normalizeProductsSearchQuery(value: MaybeString): string {
  return typeof value === "string" ? value.trim() : ""
}

export function toProductsPageParam(value: MaybeNumber): number | null {
  if (!(typeof value === "number" && Number.isFinite(value) && value > 1)) {
    return null
  }

  return Math.floor(value)
}

type BuildProductsHrefParams = {
  q?: MaybeString
  page?: MaybeNumber
}

export function buildProductsHref(params: BuildProductsHrefParams = {}): string {
  const searchParams = new URLSearchParams()
  const q = normalizeProductsSearchQuery(params.q)
  const page = toProductsPageParam(params.page)

  if (q) {
    searchParams.set("q", q)
  }

  if (page) {
    searchParams.set("page", String(page))
  }

  const query = searchParams.toString()
  return query ? `${PRODUCTS_ROUTE}?${query}` : PRODUCTS_ROUTE
}

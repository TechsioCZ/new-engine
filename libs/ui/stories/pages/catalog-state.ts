import { brandFacets, colorFacets, sizeFacets, sortOptions } from "./data"

export const PRICE_MAX = 1300

export type ListingState = {
  brands: string[]
  sizes: string[]
  colors: string[]
  price: number[]
  sort: string
}

/** Preserve Storybook's query while making the complete listing linkable. */
export function listingUrl(
  target: number,
  state: ListingState,
  search: string
) {
  const params = new URLSearchParams(search)
  params.set("page", String(target))
  for (const key of ["brands", "sizes", "colors", "price"] as const) {
    params.set(`catalog-${key}`, state[key].join(","))
  }
  params.set("catalog-sort", state.sort)
  return `?${params.toString()}`
}

export function initialListing(search: string): ListingState {
  const params = new URLSearchParams(search)
  const list = (key: string, allowed: string[]) =>
    (params.get(`catalog-${key}`) ?? "")
      .split(",")
      .filter((value) => allowed.includes(value))
  const rawPrice = (params.get("catalog-price") ?? `0,${PRICE_MAX}`)
    .split(",")
    .map(Number)
  const price =
    rawPrice.length === 2 &&
    rawPrice.every(
      (value) => Number.isFinite(value) && value >= 0 && value <= PRICE_MAX
    ) &&
    rawPrice[0] !== undefined &&
    rawPrice[1] !== undefined &&
    rawPrice[0] <= rawPrice[1]
      ? rawPrice
      : [0, PRICE_MAX]
  const sort = params.get("catalog-sort") ?? "relevance"
  return {
    brands: list(
      "brands",
      brandFacets.map((facet) => facet.value)
    ),
    sizes: list("sizes", sizeFacets),
    colors: list(
      "colors",
      colorFacets.map((facet) => facet.label)
    ),
    price,
    sort: sortOptions.some((option) => option.value === sort)
      ? sort
      : "relevance",
  }
}

export function pageFromUrl(search: string) {
  const value = Number(new URLSearchParams(search).get("page"))
  return Number.isInteger(value) && value > 0 ? value : 1
}

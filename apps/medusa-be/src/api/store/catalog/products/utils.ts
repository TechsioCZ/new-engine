import {
  BRAND_FACET_PREFIX,
  FORM_FACET_IDS,
  INGREDIENT_FACET_PREFIX,
  STATUS_FACET_IDS,
} from "../../../../modules/meilisearch/facets/product-facets"

export const CATALOG_SORT_VALUES = [
  "recommended",
  "best-selling",
  "newest",
  "oldest",
  "price-asc",
  "price-desc",
  "title-asc",
  "title-desc",
] as const

export type CatalogSortValue = (typeof CATALOG_SORT_VALUES)[number]

type MultiValueParam = string | string[] | undefined

export interface FacetCountItem {
  id: string
  label: string
  count: number
}

interface CatalogFilterInput {
  categoryIds: string[]
  statusIds: string[]
  formIds: string[]
  brandIds: string[]
  ingredientIds: string[]
  priceMin?: number
  priceMax?: number
}

const MAX_FILTER_VALUES_PER_FACET = 40

const getOwnPropertyValue = (value: object, key: string): unknown => {
  const descriptor: PropertyDescriptor | undefined =
    Object.getOwnPropertyDescriptor(value, key)
  return descriptor?.value
}

const escapeFilterValue = (value: string): string =>
  value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')

const toRawMultiValueArray = (value: MultiValueParam): string[] => {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === "string") {
    return [value]
  }

  return []
}

const normalizeMultiValueParam = (
  value: MultiValueParam,
  options?: {
    allowValue?: (value: string) => boolean
    maxItems?: number
  },
): string[] => {
  const rawValues = toRawMultiValueArray(value)
  const seen = new Set<string>()
  const result: string[] = []
  const maxItems = options?.maxItems ?? MAX_FILTER_VALUES_PER_FACET

  for (const rawValue of rawValues) {
    for (const splitValue of rawValue.split(",")) {
      const normalized = splitValue.trim()
      const isAllowed = options?.allowValue?.(normalized) ?? true
      if (normalized !== "" && !seen.has(normalized) && isAllowed) {
        seen.add(normalized)
        result.push(normalized)

        if (result.length >= maxItems) {
          return result
        }
      }
    }
  }

  return result
}

const buildOrFilterExpression = (
  field: string,
  values: string[],
): string | undefined => {
  if (values.length === 0) {
    return undefined
  }

  if (values.length === 1) {
    const [singleValue] = values
    if (singleValue === undefined) {
      return undefined
    }

    return `${field} = "${escapeFilterValue(singleValue)}"`
  }

  return `(${values
    .map((value) => `${field} = "${escapeFilterValue(value)}"`)
    .join(" OR ")})`
}

const toFinitePositiveNumber = (
  value: number | undefined,
): number | undefined => {
  if (value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return undefined
  }

  return Math.max(0, value)
}

const isCategoryIdValue = (value: string): boolean => value.length <= 120

export const isBrandFacetValue = (value: string): boolean =>
  value.startsWith(BRAND_FACET_PREFIX)

export const isIngredientFacetValue = (value: string): boolean =>
  value.startsWith(INGREDIENT_FACET_PREFIX)

export const normalizeCategoryIdsParam = (value: MultiValueParam): string[] =>
  normalizeMultiValueParam(value, { allowValue: isCategoryIdValue })

export const normalizeStatusParam = (value: MultiValueParam): string[] =>
  normalizeMultiValueParam(value, {
    allowValue: (item) => STATUS_FACET_IDS.has(item),
  })

export const normalizeFormParam = (value: MultiValueParam): string[] =>
  normalizeMultiValueParam(value, {
    allowValue: (item) => FORM_FACET_IDS.has(item),
  })

export const normalizeBrandParam = (value: MultiValueParam): string[] =>
  normalizeMultiValueParam(value, { allowValue: isBrandFacetValue })

export const normalizeIngredientParam = (value: MultiValueParam): string[] =>
  normalizeMultiValueParam(value, { allowValue: isIngredientFacetValue })

export const resolveCatalogSort = (
  sort: CatalogSortValue,
): string[] | undefined => {
  switch (sort) {
    case "recommended":
    case "best-selling": {
      return undefined
    }
    case "newest": {
      return ["created_at:desc"]
    }
    case "oldest": {
      return ["created_at:asc"]
    }
    case "price-asc": {
      return ["facet_price:asc"]
    }
    case "price-desc": {
      return ["facet_price:desc"]
    }
    case "title-asc": {
      return ["title:asc"]
    }
    case "title-desc": {
      return ["title:desc"]
    }
    default: {
      return undefined
    }
  }
}

export const buildCatalogFilterExpressions = (
  input: CatalogFilterInput,
): string[] => {
  const expressions: string[] = []

  const categoryExpression = buildOrFilterExpression(
    "facet_category_ids",
    input.categoryIds,
  )
  if (categoryExpression !== undefined) {
    expressions.push(categoryExpression)
  }

  const statusExpression = buildOrFilterExpression(
    "facet_status",
    input.statusIds,
  )
  if (statusExpression !== undefined) {
    expressions.push(statusExpression)
  }

  const formExpression = buildOrFilterExpression("facet_form", input.formIds)
  if (formExpression !== undefined) {
    expressions.push(formExpression)
  }

  const brandExpression = buildOrFilterExpression("facet_brand", input.brandIds)
  if (brandExpression !== undefined) {
    expressions.push(brandExpression)
  }

  const ingredientExpression = buildOrFilterExpression(
    "facet_ingredient",
    input.ingredientIds,
  )
  if (ingredientExpression !== undefined) {
    expressions.push(ingredientExpression)
  }

  let priceMin = toFinitePositiveNumber(input.priceMin)
  let priceMax = toFinitePositiveNumber(input.priceMax)

  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    const originalMin = priceMin
    priceMin = priceMax
    priceMax = originalMin
  }

  if (priceMin !== undefined) {
    expressions.push(`facet_price >= ${priceMin}`)
  }
  if (priceMax !== undefined) {
    expressions.push(`facet_price <= ${priceMax}`)
  }

  return expressions
}

export const getFacetDistribution = (
  distribution: unknown,
  facetKey: string,
): Map<string, number> => {
  if (
    distribution === null ||
    distribution === undefined ||
    typeof distribution !== "object" ||
    Array.isArray(distribution)
  ) {
    return new Map()
  }

  const rawFacet = getOwnPropertyValue(distribution, facetKey)
  if (
    rawFacet === null ||
    rawFacet === undefined ||
    typeof rawFacet !== "object" ||
    Array.isArray(rawFacet)
  ) {
    return new Map()
  }

  const result = new Map<string, number>()
  for (const [key, value] of Object.entries(rawFacet)) {
    if (typeof value !== "number") {
      continue
    }
    result.set(key, value)
  }

  return result
}

export const getNumericFacetStats = (
  facetStats: unknown,
  facetKey: string,
): { min?: number; max?: number } => {
  if (
    facetStats === null ||
    facetStats === undefined ||
    typeof facetStats !== "object" ||
    Array.isArray(facetStats)
  ) {
    return {}
  }

  const rawFacet = getOwnPropertyValue(facetStats, facetKey)
  if (
    rawFacet === null ||
    rawFacet === undefined ||
    typeof rawFacet !== "object" ||
    Array.isArray(rawFacet)
  ) {
    return {}
  }

  const minValue = getOwnPropertyValue(rawFacet, "min")
  const maxValue = getOwnPropertyValue(rawFacet, "max")

  const min = typeof minValue === "number" ? minValue : undefined
  const max = typeof maxValue === "number" ? maxValue : undefined

  return {
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
  }
}

export const humanizeFacetHandle = (handle: string): string =>
  handle.replaceAll("-", " ").replaceAll(/\s+/gu, " ").trim()

export const sortFacetCountItems = (
  items: FacetCountItem[],
): FacetCountItem[] =>
  items.toSorted((left, right) => {
    if (left.count !== right.count) {
      return right.count - left.count
    }

    return left.label.localeCompare(right.label, "sk")
  })

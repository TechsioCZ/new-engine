import {
  BRAND_FACET_PREFIX,
  FORM_FACET_IDS,
  INGREDIENT_FACET_PREFIX,
  STATUS_FACET_IDS,
} from "../../../../modules/meilisearch/facets/product-facets"

export const CATALOG_SORT_VALUES = [
  "recommended",
  "newest",
  "oldest",
  "title-asc",
  "title-desc",
] as const

export type CatalogSortValue = (typeof CATALOG_SORT_VALUES)[number]

type MultiValueParam = string | string[] | undefined

export type FacetCountItem = {
  id: string
  label: string
  count: number
}

type CatalogFilterInput = {
  categoryIds: string[]
  statusIds: string[]
  formIds: string[]
  brandIds: string[]
  ingredientIds: string[]
  priceMin?: number
  priceMax?: number
}

const MAX_FILTER_VALUES_PER_FACET = 40

const escapeFilterValue = (value: string): string => {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')
}

const normalizeMultiValueParam = (
  value: MultiValueParam,
  options?: {
    allowValue?: (value: string) => boolean
    maxItems?: number
  }
): string[] => {
  const rawValues = Array.isArray(value) ? value : typeof value === "string" ? [value] : []
  const seen = new Set<string>()
  const result: string[] = []
  const maxItems = options?.maxItems ?? MAX_FILTER_VALUES_PER_FACET

  for (const rawValue of rawValues) {
    for (const splitValue of rawValue.split(",")) {
      const normalized = splitValue.trim()
      if (!normalized || seen.has(normalized)) {
        continue
      }

      if (options?.allowValue && !options.allowValue(normalized)) {
        continue
      }

      seen.add(normalized)
      result.push(normalized)

      if (result.length >= maxItems) {
        return result
      }
    }
  }

  return result
}

const buildOrFilterExpression = (field: string, values: string[]): string | undefined => {
  if (values.length === 0) {
    return undefined
  }

  if (values.length === 1) {
    const singleValue = values[0]
    if (!singleValue) {
      return undefined
    }

    return `${field} = "${escapeFilterValue(singleValue)}"`
  }

  return `(${values
    .map((value) => `${field} = "${escapeFilterValue(value)}"`)
    .join(" OR ")})`
}

const toFinitePositiveNumber = (value: number | undefined): number | undefined => {
  if (value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return undefined
  }

  return Math.max(0, value)
}

const isCategoryIdValue = (value: string): boolean => {
  return value.length <= 120
}

export const isBrandFacetValue = (value: string): boolean => {
  return value.startsWith(BRAND_FACET_PREFIX)
}

export const isIngredientFacetValue = (value: string): boolean => {
  return value.startsWith(INGREDIENT_FACET_PREFIX)
}

export const normalizeCategoryIdsParam = (value: MultiValueParam): string[] => {
  return normalizeMultiValueParam(value, { allowValue: isCategoryIdValue })
}

export const normalizeStatusParam = (value: MultiValueParam): string[] => {
  return normalizeMultiValueParam(value, {
    allowValue: (item) => STATUS_FACET_IDS.has(item),
  })
}

export const normalizeFormParam = (value: MultiValueParam): string[] => {
  return normalizeMultiValueParam(value, {
    allowValue: (item) => FORM_FACET_IDS.has(item),
  })
}

export const normalizeBrandParam = (value: MultiValueParam): string[] => {
  return normalizeMultiValueParam(value, { allowValue: isBrandFacetValue })
}

export const normalizeIngredientParam = (value: MultiValueParam): string[] => {
  return normalizeMultiValueParam(value, { allowValue: isIngredientFacetValue })
}

export const resolveCatalogSort = (
  sort: CatalogSortValue
): string[] | undefined => {
  switch (sort) {
    case "newest":
      return ["created_at:desc"]
    case "oldest":
      return ["created_at:asc"]
    case "title-asc":
      return ["title:asc"]
    case "title-desc":
      return ["title:desc"]
    default:
      return undefined
  }
}

export const buildCatalogFilterExpressions = (
  input: CatalogFilterInput
): string[] => {
  const expressions: string[] = []

  const categoryExpression = buildOrFilterExpression(
    "facet_category_ids",
    input.categoryIds
  )
  if (categoryExpression) {
    expressions.push(categoryExpression)
  }

  const statusExpression = buildOrFilterExpression("facet_status", input.statusIds)
  if (statusExpression) {
    expressions.push(statusExpression)
  }

  const formExpression = buildOrFilterExpression("facet_form", input.formIds)
  if (formExpression) {
    expressions.push(formExpression)
  }

  const brandExpression = buildOrFilterExpression("facet_brand", input.brandIds)
  if (brandExpression) {
    expressions.push(brandExpression)
  }

  const ingredientExpression = buildOrFilterExpression(
    "facet_ingredient",
    input.ingredientIds
  )
  if (ingredientExpression) {
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
  facetKey: string
): Map<string, number> => {
  if (!distribution || typeof distribution !== "object" || Array.isArray(distribution)) {
    return new Map()
  }

  const rawFacet = (distribution as Record<string, unknown>)[facetKey]
  if (!rawFacet || typeof rawFacet !== "object" || Array.isArray(rawFacet)) {
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
  facetKey: string
): { min?: number; max?: number } => {
  if (!facetStats || typeof facetStats !== "object" || Array.isArray(facetStats)) {
    return {}
  }

  const rawFacet = (facetStats as Record<string, unknown>)[facetKey]
  if (!rawFacet || typeof rawFacet !== "object" || Array.isArray(rawFacet)) {
    return {}
  }

  const typedFacet = rawFacet as Record<string, unknown>
  const minValue = typedFacet.min
  const maxValue = typedFacet.max

  const min = typeof minValue === "number" ? minValue : undefined
  const max = typeof maxValue === "number" ? maxValue : undefined

  return { min, max }
}

export const humanizeFacetHandle = (handle: string): string => {
  return handle
    .replaceAll("-", " ")
    .replaceAll(/\s+/g, " ")
    .trim()
}

export const sortFacetCountItems = (items: FacetCountItem[]): FacetCountItem[] => {
  return [...items].sort((left, right) => {
    if (left.count !== right.count) {
      return right.count - left.count
    }

    return left.label.localeCompare(right.label, "sk")
  })
}

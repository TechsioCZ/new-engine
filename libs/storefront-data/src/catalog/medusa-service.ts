import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"

import type {
  CatalogFacets,
  CatalogListInputBase,
  CatalogListResponse,
  CatalogService,
} from "./types"
import { resolvePositiveInteger } from "./utils"

type MedusaCatalogListQuery = Record<string, unknown>

type MedusaCatalogListResponse = {
  products?: HttpTypes.StoreProduct[] | undefined
  count?: number | undefined
  page?: number | undefined
  limit?: number | undefined
  totalPages?: number | undefined
  facets?: unknown | undefined
}

export type MedusaCatalogListInput = CatalogListInputBase

export type MedusaCatalogTransformContext<
  TListParams extends MedusaCatalogListInput,
  TFacets,
> = {
  params: TListParams
  query: MedusaCatalogListQuery
  response: CatalogListResponse<HttpTypes.StoreProduct, TFacets>
}

export type MedusaCatalogServiceConfig<
  TProduct,
  TListParams extends MedusaCatalogListInput,
  TFacets,
> = {
  listPath?: string | undefined
  defaultLimit?: number | undefined
  defaultSort?: string | undefined
  normalizeListQuery?:
    | ((params: TListParams) => MedusaCatalogListQuery)
    | undefined
  transformProduct?: ((product: HttpTypes.StoreProduct) => TProduct) | undefined
  transformListProduct?:
    | ((
        product: HttpTypes.StoreProduct,
        context: MedusaCatalogTransformContext<TListParams, TFacets>
      ) => TProduct)
    | undefined
  transformFacets?: ((facets: CatalogFacets) => TFacets) | undefined
}

const EMPTY_FACETS: CatalogFacets = {
  status: [],
  form: [],
  brand: [],
  ingredient: [],
  price: {
    min: null,
    max: null,
  },
}

const resolveNonNegativeInteger = (
  value: number | undefined,
  fallbackValue: number
): number => {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  ) {
    return fallbackValue
  }

  const normalizedValue = Math.trunc(value)
  if (normalizedValue < 0) {
    return fallbackValue
  }

  return normalizedValue
}

const normalizeNonNegativeNumber = (
  value: number | undefined
): number | undefined => {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  ) {
    return
  }

  if (value < 0) {
    return
  }

  return value
}

const normalizeStringArray = (
  values: string[] | undefined
): string[] | undefined => {
  if (!Array.isArray(values)) {
    return
  }

  const seenValues = new Set<string>()
  const normalizedValues: string[] = []

  for (const rawValue of values) {
    if (typeof rawValue !== "string") {
      continue
    }
    const value = rawValue.trim()
    if (!value || seenValues.has(value)) {
      continue
    }

    seenValues.add(value)
    normalizedValues.push(value)
  }

  return normalizedValues.length > 0 ? normalizedValues : undefined
}

const normalizeFacetItems = (items: unknown) => {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null
      }

      const typedItem = item as Record<string, unknown>
      const rawId = typedItem["id"]
      const rawLabel = typedItem["label"]
      const rawCount = typedItem["count"]
      const id = typeof rawId === "string" ? rawId.trim() : ""
      const label = typeof rawLabel === "string" ? rawLabel.trim() : ""
      const count =
        typeof rawCount === "number" && Number.isFinite(rawCount) ? rawCount : 0

      if (!(id && label)) {
        return null
      }

      return {
        id,
        label,
        count,
      }
    })
    .filter((item): item is CatalogFacets["status"][number] => Boolean(item))
}

const normalizeFacets = (value: unknown): CatalogFacets => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return EMPTY_FACETS
  }

  const facetsRecord = value as Record<string, unknown>
  const price = facetsRecord["price"]
  const priceRecord =
    price && typeof price === "object" && !Array.isArray(price)
      ? (price as Record<string, unknown>)
      : {}
  const rawMin = priceRecord["min"]
  const rawMax = priceRecord["max"]
  const min =
    typeof rawMin === "number" && Number.isFinite(rawMin) ? rawMin : null
  const max =
    typeof rawMax === "number" && Number.isFinite(rawMax) ? rawMax : null

  return {
    status: normalizeFacetItems(facetsRecord["status"]),
    form: normalizeFacetItems(facetsRecord["form"]),
    brand: normalizeFacetItems(facetsRecord["brand"]),
    ingredient: normalizeFacetItems(facetsRecord["ingredient"]),
    price: {
      min,
      max,
    },
  }
}

const toCsv = (values: string[] | undefined): string | undefined => {
  if (!values || values.length === 0) {
    return
  }

  return values.join(",")
}

const stripNullishValues = (
  input: Record<string, unknown>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) {
      continue
    }
    result[key] = value
  }

  return result
}

const buildDefaultListQuery = (
  params: MedusaCatalogListInput,
  defaults: {
    defaultLimit: number
    defaultSort: string
  }
): MedusaCatalogListQuery => {
  const normalizedPage = resolvePositiveInteger(params.page, 1)
  const normalizedLimit = resolvePositiveInteger(
    params.limit,
    defaults.defaultLimit
  )
  const normalizedPriceMin = normalizeNonNegativeNumber(params.price_min)
  const normalizedPriceMax = normalizeNonNegativeNumber(params.price_max)
  const normalizedStatus = normalizeStringArray(params.status)
  const normalizedForm = normalizeStringArray(params.form)
  const normalizedBrand = normalizeStringArray(params.brand)
  const normalizedIngredient = normalizeStringArray(params.ingredient)
  const normalizedCategoryIds = normalizeStringArray(params.category_id)

  return stripNullishValues({
    q: params.q?.trim() || undefined,
    page: normalizedPage,
    limit: normalizedLimit,
    sort: params.sort || defaults.defaultSort,
    category_id: toCsv(normalizedCategoryIds),
    status: toCsv(normalizedStatus),
    form: toCsv(normalizedForm),
    brand: toCsv(normalizedBrand),
    ingredient: toCsv(normalizedIngredient),
    price_min: normalizedPriceMin,
    price_max: normalizedPriceMax,
    region_id: params.region_id,
    country_code: params.country_code?.toLowerCase(),
    currency_code: params.currency_code?.toLowerCase(),
  })
}

/**
 * Creates a CatalogService for Medusa Store API.
 *
 * Uses `/store/catalog/products` through `sdk.client.fetch` so query cancellation
 * works with `AbortSignal` passed by TanStack Query.
 */
export function createMedusaCatalogService<
  TProduct = HttpTypes.StoreProduct,
  TListParams extends MedusaCatalogListInput = MedusaCatalogListInput,
  TFacets = CatalogFacets,
>(
  sdk: Medusa,
  config?:
    | MedusaCatalogServiceConfig<TProduct, TListParams, TFacets>
    | undefined
): CatalogService<TProduct, TListParams, TFacets> {
  const {
    listPath = "/store/catalog/products",
    defaultLimit = 12,
    defaultSort = "recommended",
    normalizeListQuery,
    transformProduct,
    transformListProduct,
    transformFacets,
  } = config ?? {}

  const baseTransform =
    transformProduct ??
    ((product) => ({ ...product }) as typeof product & TProduct)
  const mapFacets =
    transformFacets ?? ((facets) => ({ ...facets }) as typeof facets & TFacets)
  const mapListProduct: (
    product: HttpTypes.StoreProduct,
    context: MedusaCatalogTransformContext<TListParams, TFacets>
  ) => TProduct =
    transformListProduct ??
    ((product: HttpTypes.StoreProduct) => baseTransform(product))

  const buildListQuery = (params: TListParams): MedusaCatalogListQuery => {
    if (normalizeListQuery) {
      return stripNullishValues(normalizeListQuery(params))
    }

    return buildDefaultListQuery(params, { defaultLimit, defaultSort })
  }

  return {
    async getCatalogProducts(
      params: TListParams,
      signal?: AbortSignal | undefined
    ): Promise<CatalogListResponse<TProduct, TFacets>> {
      const query = buildListQuery(params)
      const rawResponse = await sdk.client.fetch<MedusaCatalogListResponse>(
        listPath,
        {
          query,
          signal: signal ?? null,
        }
      )

      const normalizedResponse: CatalogListResponse<
        HttpTypes.StoreProduct,
        TFacets
      > = {
        products: rawResponse.products ?? [],
        count: rawResponse.count ?? 0,
        page: resolvePositiveInteger(
          rawResponse.page,
          resolvePositiveInteger(params.page, 1)
        ),
        limit: resolvePositiveInteger(
          rawResponse.limit,
          resolvePositiveInteger(params.limit, defaultLimit)
        ),
        totalPages: resolveNonNegativeInteger(rawResponse.totalPages, 0),
        facets: mapFacets(normalizeFacets(rawResponse.facets)),
      }

      const context: MedusaCatalogTransformContext<TListParams, TFacets> = {
        params,
        query,
        response: normalizedResponse,
      }

      const products = normalizedResponse.products.map((product) =>
        mapListProduct(product, context)
      )

      return {
        ...normalizedResponse,
        products,
      }
    },
  }
}

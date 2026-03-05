import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import type {
  CatalogFacets,
  CatalogListInputBase,
  CatalogListResponse,
  CatalogService,
} from "./types"

type MedusaCatalogListQuery = Record<string, unknown>

type MedusaCatalogListResponse = {
  products?: HttpTypes.StoreProduct[]
  count?: number
  page?: number
  limit?: number
  totalPages?: number
  facets?: unknown
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
  listPath?: string
  defaultLimit?: number
  defaultSort?: string
  normalizeListQuery?: (params: TListParams) => MedusaCatalogListQuery
  transformProduct?: (product: HttpTypes.StoreProduct) => TProduct
  transformListProduct?: (
    product: HttpTypes.StoreProduct,
    context: MedusaCatalogTransformContext<TListParams, TFacets>
  ) => TProduct
  transformFacets?: (facets: CatalogFacets) => TFacets
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

const resolvePositiveInteger = (
  value: number | undefined,
  fallbackValue: number
): number => {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallbackValue
  }

  const normalizedValue = Math.trunc(value)
  if (normalizedValue < 1) {
    return fallbackValue
  }

  return normalizedValue
}

const resolveNonNegativeInteger = (
  value: number | undefined,
  fallbackValue: number
): number => {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
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
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return undefined
  }

  return value < 0 ? undefined : value
}

const normalizeStringArray = (values: string[] | undefined): string[] | undefined => {
  if (!Array.isArray(values)) {
    return undefined
  }

  const seenValues = new Set<string>()
  const normalizedValues: string[] = []

  for (const rawValue of values) {
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
      const id = typeof typedItem.id === "string" ? typedItem.id.trim() : ""
      const label =
        typeof typedItem.label === "string" ? typedItem.label.trim() : ""
      const count =
        typeof typedItem.count === "number" && Number.isFinite(typedItem.count)
          ? typedItem.count
          : 0

      if (!id || !label) {
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
  const priceRecord =
    facetsRecord.price &&
    typeof facetsRecord.price === "object" &&
    !Array.isArray(facetsRecord.price)
      ? (facetsRecord.price as Record<string, unknown>)
      : {}

  const min =
    typeof priceRecord.min === "number" && Number.isFinite(priceRecord.min)
      ? priceRecord.min
      : null
  const max =
    typeof priceRecord.max === "number" && Number.isFinite(priceRecord.max)
      ? priceRecord.max
      : null

  return {
    status: normalizeFacetItems(facetsRecord.status),
    form: normalizeFacetItems(facetsRecord.form),
    brand: normalizeFacetItems(facetsRecord.brand),
    ingredient: normalizeFacetItems(facetsRecord.ingredient),
    price: {
      min,
      max,
    },
  }
}

const toCsv = (values: string[] | undefined): string | undefined => {
  if (!values || values.length === 0) {
    return undefined
  }

  return values.join(",")
}

const stripUndefinedValues = (
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
  const normalizedLimit = resolvePositiveInteger(params.limit, defaults.defaultLimit)
  const normalizedPriceMin = normalizeNonNegativeNumber(params.price_min)
  const normalizedPriceMax = normalizeNonNegativeNumber(params.price_max)
  const normalizedStatus = normalizeStringArray(params.status)
  const normalizedForm = normalizeStringArray(params.form)
  const normalizedBrand = normalizeStringArray(params.brand)
  const normalizedIngredient = normalizeStringArray(params.ingredient)
  const normalizedCategoryIds = normalizeStringArray(params.category_id)

  return stripUndefinedValues({
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
  config?: MedusaCatalogServiceConfig<TProduct, TListParams, TFacets>
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
    transformProduct ?? ((product) => product as unknown as TProduct)
  const mapFacets =
    transformFacets ?? ((facets) => facets as unknown as TFacets)
  const mapListProduct: (
    product: HttpTypes.StoreProduct,
    context: MedusaCatalogTransformContext<TListParams, TFacets>
  ) => TProduct =
    transformListProduct ??
    ((product: HttpTypes.StoreProduct) => baseTransform(product))

  const buildListQuery = (params: TListParams): MedusaCatalogListQuery => {
    if (normalizeListQuery) {
      return stripUndefinedValues(normalizeListQuery(params))
    }

    return buildDefaultListQuery(params, { defaultLimit, defaultSort })
  }

  return {
    async getCatalogProducts(
      params: TListParams,
      signal?: AbortSignal
    ): Promise<CatalogListResponse<TProduct, TFacets>> {
      const query = buildListQuery(params)
      const rawResponse = await sdk.client.fetch<MedusaCatalogListResponse>(
        listPath,
        {
          query,
          signal,
        }
      )

      const normalizedResponse: CatalogListResponse<HttpTypes.StoreProduct, TFacets> = {
        products: rawResponse.products ?? [],
        count: rawResponse.count ?? 0,
        page: resolvePositiveInteger(rawResponse.page, resolvePositiveInteger(params.page, 1)),
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

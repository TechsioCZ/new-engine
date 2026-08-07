import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { isRecord } from "@techsio/std/object"

import type { IsExactly } from "../shared/type-utils"
import type {
  CatalogFacets,
  CatalogListInputBase,
  CatalogListResponse,
  CatalogService,
} from "./types"
import { resolvePositiveInteger } from "./utils"

type MedusaCatalogListQuery = Record<string, unknown>

interface MedusaCatalogListResponse {
  products?: HttpTypes.StoreProduct[] | undefined
  count?: number | undefined
  page?: number | undefined
  limit?: number | undefined
  totalPages?: number | undefined
  facets?: unknown
}

export type MedusaCatalogListInput = CatalogListInputBase

export interface MedusaCatalogTransformContext<
  TListParams extends MedusaCatalogListInput,
  TFacets,
> {
  params: TListParams
  query: MedusaCatalogListQuery
  response: CatalogListResponse<HttpTypes.StoreProduct, TFacets>
}

interface MedusaCatalogServiceConfigBase<
  TListParams extends MedusaCatalogListInput,
> {
  listPath?: string
  defaultLimit?: number
  defaultSort?: string
  normalizeListQuery?: (params: TListParams) => MedusaCatalogListQuery
}

type MedusaCatalogProductTransforms<
  TProduct,
  TListParams extends MedusaCatalogListInput,
  TFacets,
> =
  | {
      transformProduct: (product: HttpTypes.StoreProduct) => TProduct
      transformListProduct?: (
        product: HttpTypes.StoreProduct,
        context: MedusaCatalogTransformContext<TListParams, TFacets>,
      ) => TProduct
    }
  | {
      transformProduct?: never
      transformListProduct: (
        product: HttpTypes.StoreProduct,
        context: MedusaCatalogTransformContext<TListParams, TFacets>,
      ) => TProduct
    }

type MedusaCatalogFacetTransform<TFacets> =
  IsExactly<TFacets, CatalogFacets> extends true
    ? { transformFacets?: (facets: CatalogFacets) => TFacets }
    : { transformFacets: (facets: CatalogFacets) => TFacets }

export type MedusaCatalogServiceConfig<
  TProduct,
  TListParams extends MedusaCatalogListInput,
  TFacets,
> = MedusaCatalogServiceConfigBase<TListParams> &
  (IsExactly<TProduct, HttpTypes.StoreProduct> extends true
    ? Partial<MedusaCatalogProductTransforms<TProduct, TListParams, TFacets>>
    : MedusaCatalogProductTransforms<TProduct, TListParams, TFacets>) &
  MedusaCatalogFacetTransform<TFacets>

const EMPTY_FACETS: CatalogFacets = {
  brand: [],
  form: [],
  ingredient: [],
  price: {
    max: null,
    min: null,
  },
  status: [],
}

const resolveNonNegativeInteger = (
  value: number | undefined,
  fallbackValue: number,
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
  value: number | undefined,
): number | undefined => {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  ) {
    return undefined
  }

  if (value < 0) {
    return undefined
  }

  return value
}

const normalizeStringArray = (
  values: string[] | undefined,
): string[] | undefined => {
  if (!Array.isArray(values)) {
    return undefined
  }

  const seenValues = new Set<string>()
  const normalizedValues: string[] = []

  for (const rawValue of values) {
    if (typeof rawValue === "string") {
      const value = rawValue.trim()
      if (value.length > 0 && !seenValues.has(value)) {
        seenValues.add(value)
        normalizedValues.push(value)
      }
    }
  }

  return normalizedValues.length > 0 ? normalizedValues : undefined
}

const normalizeFacetItems = (items: unknown) => {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => {
      if (!isRecord(item)) {
        return null
      }

      const { count: rawCount, id: rawId, label: rawLabel } = item
      const id = typeof rawId === "string" ? rawId.trim() : ""
      const label = typeof rawLabel === "string" ? rawLabel.trim() : ""
      const count =
        typeof rawCount === "number" && Number.isFinite(rawCount) ? rawCount : 0

      if (id.length === 0 || label.length === 0) {
        return null
      }

      return {
        count,
        id,
        label,
      }
    })
    .filter((item): item is CatalogFacets["status"][number] => item !== null)
}

const normalizeFacets = (value: unknown): CatalogFacets => {
  if (!isRecord(value)) {
    return EMPTY_FACETS
  }

  const facetsRecord = value
  const { price } = facetsRecord
  const priceRecord = isRecord(price) ? price : {}
  const { max: rawMax, min: rawMin } = priceRecord
  const min =
    typeof rawMin === "number" && Number.isFinite(rawMin) ? rawMin : null
  const max =
    typeof rawMax === "number" && Number.isFinite(rawMax) ? rawMax : null

  const { brand, form, ingredient, status } = facetsRecord

  return {
    brand: normalizeFacetItems(brand),
    form: normalizeFacetItems(form),
    ingredient: normalizeFacetItems(ingredient),
    price: {
      max,
      min,
    },
    status: normalizeFacetItems(status),
  }
}

const toCsv = (values: string[] | undefined): string | undefined => {
  if (values === undefined || values.length === 0) {
    return undefined
  }

  return values.join(",")
}

const stripNullishValues = (
  input: Record<string, unknown>,
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
  },
): MedusaCatalogListQuery => {
  const normalizedPage = resolvePositiveInteger(params.page, 1)
  const normalizedLimit = resolvePositiveInteger(
    params.limit,
    defaults.defaultLimit,
  )
  const normalizedPriceMin = normalizeNonNegativeNumber(params.price_min)
  const normalizedPriceMax = normalizeNonNegativeNumber(params.price_max)
  const normalizedStatus = normalizeStringArray(params.status)
  const normalizedForm = normalizeStringArray(params.form)
  const normalizedBrand = normalizeStringArray(params.brand)
  const normalizedIngredient = normalizeStringArray(params.ingredient)
  const normalizedCategoryIds = normalizeStringArray(params.category_id)

  return stripNullishValues({
    brand: toCsv(normalizedBrand),
    category_id: toCsv(normalizedCategoryIds),
    country_code: params.country_code?.toLowerCase(),
    currency_code: params.currency_code?.toLowerCase(),
    form: toCsv(normalizedForm),
    ingredient: toCsv(normalizedIngredient),
    limit: normalizedLimit,
    page: normalizedPage,
    price_max: normalizedPriceMax,
    price_min: normalizedPriceMin,
    q:
      params.q === undefined || params.q.trim().length === 0
        ? undefined
        : params.q.trim(),
    region_id: params.region_id,
    sort:
      params.sort === undefined || params.sort.length === 0
        ? defaults.defaultSort
        : params.sort,
    status: toCsv(normalizedStatus),
  })
}

/**
 * Creates a CatalogService for Medusa Store API.
 *
 * Uses `/store/catalog/products` through `sdk.client.fetch` so query cancellation
 * works with `AbortSignal` passed by TanStack Query.
 */
type MedusaCatalogServiceArgs<
  TProduct,
  TListParams extends MedusaCatalogListInput,
  TFacets,
> =
  IsExactly<TProduct, HttpTypes.StoreProduct> extends true
    ? IsExactly<TFacets, CatalogFacets> extends true
      ? [
          config?:
            | MedusaCatalogServiceConfig<TProduct, TListParams, TFacets>
            | undefined,
        ]
      : [config: MedusaCatalogServiceConfig<TProduct, TListParams, TFacets>]
    : [config: MedusaCatalogServiceConfig<TProduct, TListParams, TFacets>]

export function createMedusaCatalogService<
  TProduct = HttpTypes.StoreProduct,
  TListParams extends MedusaCatalogListInput = MedusaCatalogListInput,
  TFacets = CatalogFacets,
>(
  sdk: Medusa,
  ...[config]: MedusaCatalogServiceArgs<TProduct, TListParams, TFacets>
): CatalogService<TProduct, TListParams, TFacets>
export function createMedusaCatalogService<
  TListParams extends MedusaCatalogListInput,
>(
  sdk: Medusa,
  config?: MedusaCatalogServiceConfigBase<TListParams> &
    Partial<MedusaCatalogProductTransforms<unknown, TListParams, unknown>> & {
      transformFacets?: (facets: CatalogFacets) => unknown
    },
): CatalogService<unknown, TListParams, unknown> {
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
    transformProduct ?? ((product: HttpTypes.StoreProduct) => product)
  const mapFacets = transformFacets ?? ((facets: CatalogFacets) => facets)
  const mapListProduct =
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
      signal?: AbortSignal,
    ): Promise<CatalogListResponse<unknown, unknown>> {
      const query = buildListQuery(params)
      const rawResponse = await sdk.client.fetch<MedusaCatalogListResponse>(
        listPath,
        {
          query,
          signal: signal ?? null,
        },
      )

      const normalizedResponse: CatalogListResponse<
        HttpTypes.StoreProduct,
        unknown
      > = {
        count: rawResponse.count ?? 0,
        facets: mapFacets(normalizeFacets(rawResponse.facets)),
        limit: resolvePositiveInteger(
          rawResponse.limit,
          resolvePositiveInteger(params.limit, defaultLimit),
        ),
        page: resolvePositiveInteger(
          rawResponse.page,
          resolvePositiveInteger(params.page, 1),
        ),
        products: rawResponse.products ?? [],
        totalPages: resolveNonNegativeInteger(rawResponse.totalPages, 0),
      }

      const context: MedusaCatalogTransformContext<TListParams, unknown> = {
        params,
        query,
        response: normalizedResponse,
      }

      const products = normalizedResponse.products.map((product) =>
        mapListProduct(product, context),
      )

      return {
        ...normalizedResponse,
        products,
      }
    },
  }
}

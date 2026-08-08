import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { isRecord } from "@techsio/std/object"

import type { IsExactly } from "../shared/type-utils"
import type {
  CatalogFacets,
  CatalogListInputBase,
  CatalogListResponse,
  CatalogSearchMetadata,
  CatalogService,
} from "./types"
import { resolvePositiveInteger } from "./utils"

type MedusaCatalogListQuery = Record<string, unknown>

interface MedusaCatalogListResponse {
  count: number
  facets: CatalogFacets
  limit: number
  page: number
  products: HttpTypes.StoreProduct[]
  search: CatalogSearchMetadata
  totalPages: number
}

export class InvalidMedusaCatalogResponseError extends Error {
  readonly code = "INVALID_MEDUSA_CATALOG_RESPONSE"

  constructor(field: string) {
    super(`Medusa catalog response has an invalid ${field}`)
    this.name = "InvalidMedusaCatalogResponseError"
  }
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
  queryDefaults?: MedusaCatalogListQuery
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

const isOptionalNullableString = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === "string"

const isOptionalNullableBoolean = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === "boolean"

const isOptionalNullableFiniteNumber = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return true
  }
  return typeof value === "number" && Number.isFinite(value)
}

const isOptionalNullableRecord = (value: unknown): boolean =>
  value === undefined || value === null || isRecord(value)

const isOptionalNullableArray = (
  value: unknown,
  predicate: (item: unknown) => boolean,
): boolean => {
  if (value === undefined || value === null) {
    return true
  }
  return Array.isArray(value) && value.every(predicate)
}

const isCalculatedPrice = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return true
  }
  if (!isRecord(value)) {
    return false
  }
  const {
    currency_code: currencyCode,
    is_calculated_price_tax_inclusive: calculatedTaxInclusive,
    is_original_price_tax_inclusive: originalTaxInclusive,
  } = value
  const amountFields = [
    "calculated_amount",
    "original_amount",
    "price_per_unit",
  ]
  const hasValidAmounts = amountFields.every((field) =>
    isOptionalNullableFiniteNumber(value[field]),
  )
  return [
    hasValidAmounts,
    isOptionalNullableString(currencyCode),
    isOptionalNullableBoolean(calculatedTaxInclusive),
    isOptionalNullableBoolean(originalTaxInclusive),
  ].every(Boolean)
}

const isStoreProductVariant = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false
  }
  const { calculated_price: calculatedPrice, id } = value
  const hasValidStrings = ["barcode", "ean", "sku", "title", "upc"].every(
    (field) => isOptionalNullableString(value[field]),
  )
  return (
    typeof id === "string" &&
    hasValidStrings &&
    isCalculatedPrice(calculatedPrice)
  )
}

const isStoreProductCategory = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false
  }
  const { id } = value
  return (
    typeof id === "string" &&
    typeof value["handle"] === "string" &&
    typeof value["name"] === "string" &&
    isOptionalNullableString(value["parent_category_id"])
  )
}

const hasRequiredStringFields = (
  value: Record<string, unknown>,
  fields: string[],
): boolean => fields.every((field) => typeof value[field] === "string")

const isStoreProductBrand = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return true
  }
  const isBrand = (brand: unknown): boolean =>
    isRecord(brand) && hasRequiredStringFields(brand, ["handle", "id", "title"])
  return Array.isArray(value) ? value.every(isBrand) : isBrand(value)
}

const isStoreProductImage = (value: unknown): boolean =>
  isRecord(value) &&
  hasRequiredStringFields(value, ["id", "url"]) &&
  typeof value["rank"] === "number" &&
  Number.isFinite(value["rank"])

const isStoreProductOptionValue = (value: unknown): boolean =>
  isRecord(value) && hasRequiredStringFields(value, ["id", "value"])

const isStoreProductOption = (value: unknown): boolean =>
  isRecord(value) &&
  hasRequiredStringFields(value, ["id", "title"]) &&
  typeof value["is_exclusive"] === "boolean" &&
  isOptionalNullableArray(value["values"], isStoreProductOptionValue)

const isStoreProductTag = (value: unknown): boolean =>
  isRecord(value) && hasRequiredStringFields(value, ["id", "value"])

const isStoreProductCollection = (value: unknown): boolean =>
  isRecord(value) && hasRequiredStringFields(value, ["handle", "id", "title"])

const isStoreProductType = (value: unknown): boolean =>
  isRecord(value) && hasRequiredStringFields(value, ["id", "value"])

const isStoreProduct = (value: unknown): value is HttpTypes.StoreProduct => {
  if (!isRecord(value)) {
    return false
  }
  const {
    brand,
    categories,
    collection,
    created_at: createdAt,
    handle,
    id,
    images,
    metadata,
    options,
    status,
    tags,
    thumbnail,
    title,
    type,
    updated_at: updatedAt,
    variants,
  } = value
  const hasValidCoreFields = [
    typeof id === "string",
    typeof title === "string",
    typeof handle === "string",
    isOptionalNullableString(thumbnail),
    isOptionalNullableString(createdAt),
    isOptionalNullableString(updatedAt),
    isOptionalNullableString(status),
    isOptionalNullableRecord(metadata),
  ].every(Boolean)
  if (!hasValidCoreFields) {
    return false
  }
  const optionalStringFields = [
    "collection_id",
    "description",
    "external_id",
    "hs_code",
    "material",
    "mid_code",
    "origin_country",
    "subtitle",
    "type_id",
  ]
  const optionalNumberFields = ["height", "length", "weight", "width"]
  const optionalBooleanFields = ["discountable", "is_giftcard"]

  return [
    optionalStringFields.every((field) =>
      isOptionalNullableString(value[field]),
    ),
    optionalNumberFields.every((field) =>
      isOptionalNullableFiniteNumber(value[field]),
    ),
    optionalBooleanFields.every((field) =>
      isOptionalNullableBoolean(value[field]),
    ),
    isOptionalNullableArray(variants, isStoreProductVariant),
    isOptionalNullableArray(categories, isStoreProductCategory),
    isOptionalNullableArray(images, isStoreProductImage),
    isOptionalNullableArray(options, isStoreProductOption),
    isOptionalNullableArray(tags, isStoreProductTag),
    isStoreProductBrand(brand),
    collection === undefined ||
      collection === null ||
      isStoreProductCollection(collection),
    type === undefined || type === null || isStoreProductType(type),
  ].every(Boolean)
}

const parseInteger = (
  value: unknown,
  field: string,
  minimum: number,
): number => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < minimum
  ) {
    throw new InvalidMedusaCatalogResponseError(field)
  }
  return value
}

const parseFacetItems = (
  value: unknown,
  field: string,
): CatalogFacets["status"] => {
  if (!Array.isArray(value)) {
    throw new InvalidMedusaCatalogResponseError(`facets.${field}`)
  }

  return value.map((item) => {
    if (!isRecord(item)) {
      throw new InvalidMedusaCatalogResponseError(`facets.${field} item`)
    }
    const { count: rawCount, id, label } = item
    if (
      typeof id !== "string" ||
      id.trim().length === 0 ||
      typeof label !== "string" ||
      label.trim().length === 0
    ) {
      throw new InvalidMedusaCatalogResponseError(`facets.${field} item`)
    }
    const count = parseInteger(rawCount, `facets.${field} count`, 0)
    return { count, id, label }
  })
}

const parsePriceBoundary = (value: unknown, field: string): number | null => {
  if (value === null) {
    return null
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new InvalidMedusaCatalogResponseError(`facets.price.${field}`)
  }
  return value
}

const parseFacets = (value: unknown): CatalogFacets => {
  if (!isRecord(value)) {
    throw new InvalidMedusaCatalogResponseError("facets")
  }
  const { brand, form, ingredient, price, status } = value
  if (!isRecord(price)) {
    throw new InvalidMedusaCatalogResponseError("facets")
  }
  const { max, min } = price
  return {
    brand: parseFacetItems(brand, "brand"),
    form: parseFacetItems(form, "form"),
    ingredient: parseFacetItems(ingredient, "ingredient"),
    price: {
      max: parsePriceBoundary(max, "max"),
      min: parsePriceBoundary(min, "min"),
    },
    status: parseFacetItems(status, "status"),
  }
}

const parseSearchMetadata = (value: unknown): CatalogSearchMetadata => {
  if (!isRecord(value)) {
    throw new InvalidMedusaCatalogResponseError("search metadata")
  }
  const { degraded, exactIdentifierMatch, profile } = value
  if (
    typeof degraded !== "boolean" ||
    typeof exactIdentifierMatch !== "boolean" ||
    typeof profile !== "string" ||
    profile.length === 0
  ) {
    throw new InvalidMedusaCatalogResponseError("search metadata")
  }
  return { degraded, exactIdentifierMatch, profile }
}

const parseMedusaCatalogResponse = (
  value: unknown,
): MedusaCatalogListResponse => {
  if (!isRecord(value) || !Array.isArray(value["products"])) {
    throw new InvalidMedusaCatalogResponseError("response body")
  }
  if (!value["products"].every(isStoreProduct)) {
    throw new InvalidMedusaCatalogResponseError("products")
  }

  const count = parseInteger(value["count"], "count", 0)
  const facets = parseFacets(value["facets"])
  const limit = parseInteger(value["limit"], "limit", 1)
  const page = parseInteger(value["page"], "page", 1)
  const totalPages = parseInteger(value["totalPages"], "totalPages", 0)
  const remainingProductCount = Math.max(0, count - (page - 1) * limit)
  if (
    value["products"].length > limit ||
    value["products"].length > remainingProductCount
  ) {
    throw new InvalidMedusaCatalogResponseError("products page size")
  }
  if (totalPages !== Math.ceil(count / limit)) {
    throw new InvalidMedusaCatalogResponseError("pagination totals")
  }
  if (
    facets.price.min !== null &&
    facets.price.max !== null &&
    facets.price.min > facets.price.max
  ) {
    throw new InvalidMedusaCatalogResponseError("facets.price bounds")
  }

  return {
    count,
    facets,
    limit,
    page,
    products: value["products"],
    search: parseSearchMetadata(value["search"]),
    totalPages,
  }
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
    locale:
      params.locale === undefined || params.locale.trim().length === 0
        ? undefined
        : params.locale.trim(),
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
    queryDefaults,
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
      return stripNullishValues({
        ...queryDefaults,
        ...normalizeListQuery(params),
      })
    }

    return stripNullishValues({
      ...queryDefaults,
      ...buildDefaultListQuery(params, { defaultLimit, defaultSort }),
    })
  }

  return {
    async getCatalogProducts(
      params: TListParams,
      signal?: AbortSignal,
    ): Promise<CatalogListResponse<unknown, unknown>> {
      const query = buildListQuery(params)
      const rawResponse: unknown = await sdk.client.fetch<unknown>(listPath, {
        query,
        signal: signal ?? null,
      })
      const parsedResponse = parseMedusaCatalogResponse(rawResponse)

      const normalizedResponse: CatalogListResponse<
        HttpTypes.StoreProduct,
        unknown
      > & { search: CatalogSearchMetadata } = {
        ...parsedResponse,
        facets: mapFacets(parsedResponse.facets),
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

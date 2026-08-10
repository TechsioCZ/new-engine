import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { getRecordValue, isRecord, omitUndefined } from "@techsio/std/object"

import type { IsExactly } from "../shared/type-utils"
import type {
  CatalogFacets,
  CatalogListInputBase,
  CatalogListResponse,
  CatalogSearchMetadata,
  CatalogService,
} from "./types"
import { resolvePositiveInteger } from "./utils"

export interface MedusaCatalogListQuery {
  brand?: string
  category_id?: string
  country_code?: string
  currency_code?: string
  form?: string
  ingredient?: string
  limit?: number
  locale?: string
  page?: number
  price_max?: number
  price_min?: number
  q?: string
  region_id?: string
  sort?: string
  status?: string
}

type OptionalDecodedFields<T extends object> = {
  [TKey in keyof T]?: T[TKey] | undefined
}

export type MedusaCatalogCalculatedPrice = OptionalDecodedFields<
  Omit<
    Pick<
      NonNullable<HttpTypes.StoreProductVariant["calculated_price"]>,
      | "calculated_amount"
      | "currency_code"
      | "is_calculated_price_tax_inclusive"
      | "is_original_price_tax_inclusive"
      | "original_amount"
    >,
    "calculated_amount" | "original_amount"
  >
> & {
  calculated_amount?: number | null | undefined
  original_amount?: number | null | undefined
  price_per_unit?: number | null | undefined
}

export type MedusaCatalogProductVariant = Pick<
  HttpTypes.StoreProductVariant,
  "id"
> &
  OptionalDecodedFields<
    Pick<
      HttpTypes.StoreProductVariant,
      | "allow_backorder"
      | "barcode"
      | "ean"
      | "manage_inventory"
      | "sku"
      | "title"
      | "upc"
    >
  > & {
    calculated_price?: MedusaCatalogCalculatedPrice | null | undefined
  }

export type MedusaCatalogProductCategory = Pick<
  HttpTypes.StoreProductCategory,
  "handle" | "id" | "name"
> &
  OptionalDecodedFields<
    Pick<HttpTypes.StoreProductCategory, "parent_category_id">
  >

export interface MedusaCatalogProductBrand {
  handle: string
  id: string
  title: string
}

export type MedusaCatalogProductBrandValue =
  | MedusaCatalogProductBrand
  | MedusaCatalogProductBrand[]
  | null

export type MedusaCatalogProductImage = Pick<
  HttpTypes.StoreProductImage,
  "id" | "rank" | "url"
>

export type MedusaCatalogProductOptionValue = Pick<
  HttpTypes.StoreProductOptionValue,
  "id" | "value"
>

export type MedusaCatalogProductOption = Pick<
  HttpTypes.StoreProductOption,
  "id" | "is_exclusive" | "title"
> & {
  values?: MedusaCatalogProductOptionValue[] | null | undefined
}

export type MedusaCatalogProductTag = Pick<
  HttpTypes.StoreProductTag,
  "id" | "value"
>

export type MedusaCatalogProductCollection = Pick<
  HttpTypes.StoreCollection,
  "handle" | "id" | "title"
>

export type MedusaCatalogProductType = Pick<
  HttpTypes.StoreProductType,
  "id" | "value"
>

type MedusaCatalogProductRequiredFields = Pick<
  HttpTypes.StoreProduct,
  "handle" | "id" | "title"
>

type MedusaCatalogProductOptionalFields = OptionalDecodedFields<
  Pick<
    HttpTypes.StoreProduct,
    | "collection_id"
    | "created_at"
    | "deleted_at"
    | "description"
    | "discountable"
    | "external_id"
    | "height"
    | "hs_code"
    | "is_giftcard"
    | "length"
    | "material"
    | "mid_code"
    | "origin_country"
    | "status"
    | "subtitle"
    | "thumbnail"
    | "type_id"
    | "updated_at"
    | "weight"
    | "width"
  >
>

/** The validated product projection returned by the catalog endpoint. */
export type MedusaCatalogProduct = MedusaCatalogProductRequiredFields &
  MedusaCatalogProductOptionalFields & {
    brand?: MedusaCatalogProductBrandValue | undefined
    categories?: MedusaCatalogProductCategory[] | null | undefined
    collection?: MedusaCatalogProductCollection | null | undefined
    images?: MedusaCatalogProductImage[] | null | undefined
    metadata?: object | null | undefined
    options?: MedusaCatalogProductOption[] | null | undefined
    tags?: MedusaCatalogProductTag[] | null | undefined
    type?: MedusaCatalogProductType | null | undefined
    variants?: MedusaCatalogProductVariant[] | null | undefined
  }

interface MedusaCatalogListResponse {
  count: number
  facets: CatalogFacets
  limit: number
  page: number
  products: MedusaCatalogProduct[]
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
  response: CatalogListResponse<MedusaCatalogProduct, TFacets>
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
      transformProduct: (product: MedusaCatalogProduct) => TProduct
      transformListProduct?: (
        product: MedusaCatalogProduct,
        context: MedusaCatalogTransformContext<TListParams, TFacets>,
      ) => TProduct
    }
  | {
      transformProduct?: never
      transformListProduct: (
        product: MedusaCatalogProduct,
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
  (IsExactly<TProduct, MedusaCatalogProduct> extends true
    ? Partial<MedusaCatalogProductTransforms<TProduct, TListParams, TFacets>>
    : MedusaCatalogProductTransforms<TProduct, TListParams, TFacets>) &
  MedusaCatalogFacetTransform<TFacets>

const isOptionalNullableString = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === "string"

const isOptionalStoreProductStatus = (
  value: unknown,
): value is HttpTypes.StoreProduct["status"] | undefined => {
  switch (value) {
    case "draft":
    case "proposed":
    case "published":
    case "rejected": {
      return true
    }
    default: {
      return value === undefined
    }
  }
}

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
  const currencyCode = getRecordValue(value, "currency_code")
  const calculatedTaxInclusive = getRecordValue(
    value,
    "is_calculated_price_tax_inclusive",
  )
  const originalTaxInclusive = getRecordValue(
    value,
    "is_original_price_tax_inclusive",
  )
  const amountFields = [
    "calculated_amount",
    "original_amount",
    "price_per_unit",
  ]
  const hasValidAmounts = amountFields.every((field) =>
    isOptionalNullableFiniteNumber(getRecordValue(value, field)),
  )
  return [
    hasValidAmounts,
    isOptionalNullableString(currencyCode),
    isOptionalNullableBoolean(calculatedTaxInclusive),
    isOptionalNullableBoolean(originalTaxInclusive),
  ].every(Boolean)
}

const isMedusaCatalogProductVariant = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false
  }
  const calculatedPrice = getRecordValue(value, "calculated_price")
  const id = getRecordValue(value, "id")
  const hasValidStrings = ["barcode", "ean", "sku", "title", "upc"].every(
    (field) => isOptionalNullableString(getRecordValue(value, field)),
  )
  const hasValidInventoryFlags = ["allow_backorder", "manage_inventory"].every(
    (field) => isOptionalNullableBoolean(getRecordValue(value, field)),
  )
  return (
    typeof id === "string" &&
    hasValidStrings &&
    hasValidInventoryFlags &&
    isCalculatedPrice(calculatedPrice)
  )
}

const isMedusaCatalogProductCategory = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false
  }
  const id = getRecordValue(value, "id")
  return (
    typeof id === "string" &&
    typeof getRecordValue(value, "handle") === "string" &&
    typeof getRecordValue(value, "name") === "string" &&
    isOptionalNullableString(getRecordValue(value, "parent_category_id"))
  )
}

const hasRequiredStringFields = (value: object, fields: string[]): boolean =>
  fields.every((field) => typeof Reflect.get(value, field) === "string")

const isMedusaCatalogProductBrand = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return true
  }
  const isBrand = (brand: unknown): boolean =>
    isRecord(brand) && hasRequiredStringFields(brand, ["handle", "id", "title"])
  return Array.isArray(value) ? value.every(isBrand) : isBrand(value)
}

const isMedusaCatalogProductImage = (value: unknown): boolean =>
  isRecord(value) &&
  hasRequiredStringFields(value, ["id", "url"]) &&
  typeof getRecordValue(value, "rank") === "number" &&
  Number.isFinite(getRecordValue(value, "rank"))

const isMedusaCatalogProductOptionValue = (value: unknown): boolean =>
  isRecord(value) && hasRequiredStringFields(value, ["id", "value"])

const isMedusaCatalogProductOption = (value: unknown): boolean =>
  isRecord(value) &&
  hasRequiredStringFields(value, ["id", "title"]) &&
  typeof getRecordValue(value, "is_exclusive") === "boolean" &&
  isOptionalNullableArray(
    getRecordValue(value, "values"),
    isMedusaCatalogProductOptionValue,
  )

const isMedusaCatalogProductTag = (value: unknown): boolean =>
  isRecord(value) && hasRequiredStringFields(value, ["id", "value"])

const isMedusaCatalogProductCollection = (value: unknown): boolean =>
  isRecord(value) && hasRequiredStringFields(value, ["handle", "id", "title"])

const isMedusaCatalogProductType = (value: unknown): boolean =>
  isRecord(value) && hasRequiredStringFields(value, ["id", "value"])

const isMedusaCatalogProduct = (
  value: unknown,
): value is MedusaCatalogProduct => {
  if (!isRecord(value)) {
    return false
  }
  const brand = getRecordValue(value, "brand")
  const categories = getRecordValue(value, "categories")
  const collection = getRecordValue(value, "collection")
  const createdAt = getRecordValue(value, "created_at")
  const handle = getRecordValue(value, "handle")
  const id = getRecordValue(value, "id")
  const images = getRecordValue(value, "images")
  const metadata = getRecordValue(value, "metadata")
  const options = getRecordValue(value, "options")
  const status = getRecordValue(value, "status")
  const tags = getRecordValue(value, "tags")
  const thumbnail = getRecordValue(value, "thumbnail")
  const title = getRecordValue(value, "title")
  const type = getRecordValue(value, "type")
  const updatedAt = getRecordValue(value, "updated_at")
  const variants = getRecordValue(value, "variants")
  const hasValidCoreFields = [
    typeof id === "string",
    typeof title === "string",
    typeof handle === "string",
    isOptionalNullableString(thumbnail),
    isOptionalNullableString(createdAt),
    isOptionalNullableString(updatedAt),
    isOptionalStoreProductStatus(status),
    isOptionalNullableRecord(metadata),
  ].every(Boolean)
  if (!hasValidCoreFields) {
    return false
  }
  const optionalStringFields = [
    "collection_id",
    "deleted_at",
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
      isOptionalNullableString(getRecordValue(value, field)),
    ),
    optionalNumberFields.every((field) =>
      isOptionalNullableFiniteNumber(getRecordValue(value, field)),
    ),
    optionalBooleanFields.every((field) =>
      isOptionalNullableBoolean(getRecordValue(value, field)),
    ),
    isOptionalNullableArray(variants, isMedusaCatalogProductVariant),
    isOptionalNullableArray(categories, isMedusaCatalogProductCategory),
    isOptionalNullableArray(images, isMedusaCatalogProductImage),
    isOptionalNullableArray(options, isMedusaCatalogProductOption),
    isOptionalNullableArray(tags, isMedusaCatalogProductTag),
    isMedusaCatalogProductBrand(brand),
    collection === undefined ||
      collection === null ||
      isMedusaCatalogProductCollection(collection),
    type === undefined || type === null || isMedusaCatalogProductType(type),
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
    const rawCount = getRecordValue(item, "count")
    const id = getRecordValue(item, "id")
    const label = getRecordValue(item, "label")
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
  const brand = getRecordValue(value, "brand")
  const form = getRecordValue(value, "form")
  const ingredient = getRecordValue(value, "ingredient")
  const price = getRecordValue(value, "price")
  const status = getRecordValue(value, "status")
  if (!isRecord(price)) {
    throw new InvalidMedusaCatalogResponseError("facets")
  }
  const max = getRecordValue(price, "max")
  const min = getRecordValue(price, "min")
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
  const degraded = getRecordValue(value, "degraded")
  const exactIdentifierMatch = getRecordValue(value, "exactIdentifierMatch")
  const profile = getRecordValue(value, "profile")
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
  if (!isRecord(value)) {
    throw new InvalidMedusaCatalogResponseError("response body")
  }
  const products = getRecordValue(value, "products")
  if (!Array.isArray(products)) {
    throw new InvalidMedusaCatalogResponseError("response body")
  }
  if (!products.every(isMedusaCatalogProduct)) {
    throw new InvalidMedusaCatalogResponseError("products")
  }

  const count = parseInteger(getRecordValue(value, "count"), "count", 0)
  const facets = parseFacets(getRecordValue(value, "facets"))
  const limit = parseInteger(getRecordValue(value, "limit"), "limit", 1)
  const page = parseInteger(getRecordValue(value, "page"), "page", 1)
  const totalPages = parseInteger(
    getRecordValue(value, "totalPages"),
    "totalPages",
    0,
  )
  const remainingProductCount = Math.max(0, count - (page - 1) * limit)
  if (products.length > limit || products.length > remainingProductCount) {
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
    products,
    search: parseSearchMetadata(getRecordValue(value, "search")),
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

const omitNullish = <T extends object>(input: T) => {
  const result = omitUndefined(input)
  for (const [key, value] of Object.entries(result)) {
    if (value === null) {
      Reflect.deleteProperty(result, key)
    }
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

  return omitNullish({
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
  IsExactly<TProduct, MedusaCatalogProduct> extends true
    ? IsExactly<TFacets, CatalogFacets> extends true
      ? [
          config?:
            | MedusaCatalogServiceConfig<TProduct, TListParams, TFacets>
            | undefined,
        ]
      : [config: MedusaCatalogServiceConfig<TProduct, TListParams, TFacets>]
    : [config: MedusaCatalogServiceConfig<TProduct, TListParams, TFacets>]

export function createMedusaCatalogService<
  TProduct = MedusaCatalogProduct,
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
    Partial<
      MedusaCatalogProductTransforms<MedusaCatalogProduct, TListParams, unknown>
    > & {
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
    transformProduct ?? ((product: MedusaCatalogProduct) => product)
  const mapFacets = transformFacets ?? ((facets: CatalogFacets) => facets)
  const mapListProduct =
    transformListProduct ??
    ((product: MedusaCatalogProduct) => baseTransform(product))

  const buildListQuery = (params: TListParams): MedusaCatalogListQuery => {
    if (normalizeListQuery) {
      return omitNullish({
        ...queryDefaults,
        ...normalizeListQuery(params),
      })
    }

    return omitNullish({
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
        MedusaCatalogProduct,
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

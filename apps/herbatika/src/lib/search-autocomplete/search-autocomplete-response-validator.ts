import { isRecord } from "@techsio/std/object"

import type {
  RawSearchAutocompleteBrandRef,
  RawSearchAutocompleteCategoryRef,
  RawSearchAutocompleteContentHit,
  RawSearchAutocompleteProductHit,
} from "./search-autocomplete-types"

export interface CatalogAutocompleteResponse {
  brands: RawSearchAutocompleteBrandRef[]
  categories: RawSearchAutocompleteCategoryRef[]
  content: RawSearchAutocompleteContentHit[]
  degraded: boolean
  products: RawSearchAutocompleteProductHit[]
}

class InvalidCatalogAutocompleteResponseError extends Error {
  readonly code = "INVALID_CATALOG_AUTOCOMPLETE_RESPONSE"

  constructor(field: string) {
    super(`Catalog autocomplete returned an invalid ${field}`)
    this.name = "InvalidCatalogAutocompleteResponseError"
  }
}

const isOptionalNullableRecord = (value: unknown) =>
  value === undefined || value === null || isRecord(value)
const isOptionalNullableString = (value: unknown) =>
  value === undefined || value === null || typeof value === "string"
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0
const hasValidStringFields = (
  value: Record<string, unknown>,
  fields: readonly string[],
) => fields.every((field) => isOptionalNullableString(value[field]))
const hasRequiredStringFields = (
  value: Record<string, unknown>,
  fields: readonly string[],
) => fields.every((field) => isNonEmptyString(value[field]))

const isRawCalculatedPrice = (value: unknown) => {
  if (value === undefined || value === null) {
    return true
  }
  if (!isRecord(value)) {
    return false
  }
  const amount = value["calculated_amount"]
  if (
    amount !== undefined &&
    amount !== null &&
    (typeof amount !== "number" || !Number.isFinite(amount))
  ) {
    return false
  }
  return isOptionalNullableString(value["currency_code"])
}

const isRawVariant = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  isNonEmptyString(value["id"]) &&
  hasValidStringFields(value, ["barcode", "ean", "sku", "title", "upc"]) &&
  isRawCalculatedPrice(value["calculated_price"])

const isRawBrandRef = (
  value: unknown,
): value is RawSearchAutocompleteBrandRef =>
  isRecord(value) && hasRequiredStringFields(value, ["handle", "id", "title"])
const isRawCategoryRef = (
  value: unknown,
): value is RawSearchAutocompleteCategoryRef =>
  isRecord(value) && hasRequiredStringFields(value, ["handle", "id", "name"])

const isSafeLocalHref = (value: unknown): value is string => {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return false
  }
  for (const character of value) {
    const codePoint = character.codePointAt(0)
    if (codePoint === undefined || codePoint < 32) {
      return false
    }
  }
  return true
}

const isRawContentHit = (
  value: unknown,
): value is RawSearchAutocompleteContentHit =>
  isRecord(value) &&
  hasRequiredStringFields(value, ["href", "id", "title"]) &&
  isSafeLocalHref(value["href"]) &&
  hasValidStringFields(value, ["excerpt", "type"])

const isRawProductHit = (
  value: unknown,
): value is RawSearchAutocompleteProductHit => {
  if (!isRecord(value)) {
    return false
  }
  const { brand, categories, metadata, search_result: result, variants } = value
  if (
    !hasRequiredStringFields(value, ["handle", "id", "title"]) ||
    !isOptionalNullableString(value["thumbnail"]) ||
    !isOptionalNullableRecord(metadata)
  ) {
    return false
  }
  if (brand !== undefined && brand !== null && !isRawBrandRef(brand)) {
    return false
  }
  if (
    categories !== undefined &&
    categories !== null &&
    (!Array.isArray(categories) || !categories.every(isRawCategoryRef))
  ) {
    return false
  }
  if (
    result !== undefined &&
    (!isRecord(result) ||
      !hasValidStringFields(result, ["variant_id", "variant_title"]))
  ) {
    return false
  }
  return (
    variants === undefined ||
    variants === null ||
    (Array.isArray(variants) && variants.every(isRawVariant))
  )
}

const parseArray = <T>(
  value: unknown,
  predicate: (item: unknown) => item is T,
  field: string,
): T[] => {
  if (!Array.isArray(value) || !value.every(predicate)) {
    throw new InvalidCatalogAutocompleteResponseError(field)
  }
  return value
}

export const parseCatalogAutocompleteResponse = (
  value: unknown,
): CatalogAutocompleteResponse => {
  if (!isRecord(value)) {
    throw new InvalidCatalogAutocompleteResponseError("response body")
  }
  if (typeof value["degraded"] !== "boolean") {
    throw new InvalidCatalogAutocompleteResponseError("degraded flag")
  }
  return {
    brands: parseArray(value["brands"], isRawBrandRef, "brands"),
    categories: parseArray(value["categories"], isRawCategoryRef, "categories"),
    content: parseArray(value["content"], isRawContentHit, "content"),
    degraded: value["degraded"],
    products: parseArray(value["products"], isRawProductHit, "products"),
  }
}

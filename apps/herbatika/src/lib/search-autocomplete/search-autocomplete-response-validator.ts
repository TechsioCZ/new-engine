import { getRecordValue, isRecord } from "@techsio/std/object"

import {
  decodeBrandRef,
  decodeCategoryRef,
  decodeContentHit,
  decodeItems,
} from "./search-autocomplete-response-core-decoders"
import { decodeProductHit } from "./search-autocomplete-response-product-decoder"
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

const parseArray = <T>(
  value: unknown,
  decoder: (item: unknown) => T | null,
  field: string,
): T[] => {
  const decoded = decodeItems(value, decoder)
  if (decoded === null) {
    throw new InvalidCatalogAutocompleteResponseError(field)
  }
  return decoded
}

export const parseCatalogAutocompleteResponse = (
  value: unknown,
): CatalogAutocompleteResponse => {
  if (!isRecord(value)) {
    throw new InvalidCatalogAutocompleteResponseError("response body")
  }
  const degraded = getRecordValue(value, "degraded")
  if (typeof degraded !== "boolean") {
    throw new InvalidCatalogAutocompleteResponseError("degraded flag")
  }
  return {
    brands: parseArray(
      getRecordValue(value, "brands"),
      decodeBrandRef,
      "brands",
    ),
    categories: parseArray(
      getRecordValue(value, "categories"),
      decodeCategoryRef,
      "categories",
    ),
    content: parseArray(
      getRecordValue(value, "content"),
      decodeContentHit,
      "content",
    ),
    degraded,
    products: parseArray(
      getRecordValue(value, "products"),
      decodeProductHit,
      "products",
    ),
  }
}

import { isRecord } from "@techsio/std/object"

import {
  decodeBrandRef,
  decodeCategoryRef,
  decodeFiniteNumber,
  decodeItems,
  decodeOptional,
  decodeRequiredString,
  decodeString,
} from "./search-autocomplete-response-core-decoders"
import type { RawSearchAutocompleteProductHit } from "./search-autocomplete-types"

const decodeCalculatedPrice = (value: unknown) => {
  if (!isRecord(value)) {
    return null
  }
  const amount = decodeOptional(value, "calculated_amount", decodeFiniteNumber)
  const currency = decodeOptional(value, "currency_code", decodeString)
  return amount === null || currency === null
    ? null
    : {
        ...(amount.included ? { calculated_amount: amount.value } : {}),
        ...(currency.included ? { currency_code: currency.value } : {}),
      }
}

const decodeVariant = (value: unknown) => {
  if (!isRecord(value)) {
    return null
  }
  const barcode = decodeOptional(value, "barcode", decodeString)
  const price = decodeOptional(value, "calculated_price", decodeCalculatedPrice)
  const ean = decodeOptional(value, "ean", decodeString)
  const id = decodeRequiredString(value, "id")
  const sku = decodeOptional(value, "sku", decodeString)
  const title = decodeOptional(value, "title", decodeString)
  const upc = decodeOptional(value, "upc", decodeString)
  if (barcode === null || price === null || ean === null) {
    return null
  }
  if (id === null || sku === null || title === null) {
    return null
  }
  if (upc === null) {
    return null
  }
  return {
    ...(barcode.included ? { barcode: barcode.value } : {}),
    ...(price.included ? { calculated_price: price.value } : {}),
    ...(ean.included ? { ean: ean.value } : {}),
    id,
    ...(sku.included ? { sku: sku.value } : {}),
    ...(title.included ? { title: title.value } : {}),
    ...(upc.included ? { upc: upc.value } : {}),
  }
}

const decodeSearchResult = (value: unknown) => {
  if (!isRecord(value)) {
    return null
  }
  const id = decodeOptional(value, "variant_id", decodeString)
  const title = decodeOptional(value, "variant_title", decodeString)
  return id === null || title === null
    ? null
    : {
        ...(id.included ? { variant_id: id.value } : {}),
        ...(title.included ? { variant_title: title.value } : {}),
      }
}

export const decodeProductHit = (
  value: unknown,
): RawSearchAutocompleteProductHit | null => {
  if (!isRecord(value)) {
    return null
  }
  const brand = decodeOptional(value, "brand", decodeBrandRef)
  const categories = decodeOptional(value, "categories", (items) =>
    decodeItems(items, decodeCategoryRef),
  )
  const handle = decodeRequiredString(value, "handle")
  const id = decodeRequiredString(value, "id")
  const metadata = decodeOptional(value, "metadata", (item) =>
    isRecord(item) ? item : null,
  )
  const result = decodeOptional(
    value,
    "search_result",
    decodeSearchResult,
    false,
  )
  const thumbnail = decodeOptional(value, "thumbnail", decodeString)
  const title = decodeRequiredString(value, "title")
  const variants = decodeOptional(value, "variants", (items) =>
    decodeItems(items, decodeVariant),
  )
  if (brand === null || categories === null || handle === null) {
    return null
  }
  if (id === null || metadata === null || result === null) {
    return null
  }
  if (thumbnail === null || title === null || variants === null) {
    return null
  }
  return {
    ...(brand.included ? { brand: brand.value } : {}),
    ...(categories.included ? { categories: categories.value } : {}),
    handle,
    id,
    ...(metadata.included ? { metadata: metadata.value } : {}),
    ...(result.included && result.value !== null
      ? { search_result: result.value }
      : {}),
    ...(thumbnail.included ? { thumbnail: thumbnail.value } : {}),
    title,
    ...(variants.included ? { variants: variants.value } : {}),
  }
}

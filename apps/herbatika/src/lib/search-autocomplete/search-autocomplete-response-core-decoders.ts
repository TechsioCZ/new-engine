import { getRecordValue, isRecord } from "@techsio/std/object"

import type {
  RawSearchAutocompleteBrandRef,
  RawSearchAutocompleteCategoryRef,
  RawSearchAutocompleteContentHit,
} from "./search-autocomplete-types"

export interface DecodedOptional<T> {
  included: boolean
  value: T | null
}

export const decodeString = (value: unknown) =>
  typeof value === "string" ? value : null

export const decodeFiniteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null

export const decodeRequiredString = (record: object, key: string) => {
  const value = decodeString(getRecordValue(record, key))
  return value !== null && value.trim().length > 0 ? value : null
}

export const decodeOptional = <T>(
  record: object,
  key: string,
  decoder: (value: unknown) => T | null,
  nullable = true,
): DecodedOptional<T> | null => {
  if (!Object.hasOwn(record, key)) {
    return { included: false, value: null }
  }
  const value = getRecordValue(record, key)
  if (nullable && value === null) {
    return { included: true, value: null }
  }
  const decoded = decoder(value)
  return decoded === null ? null : { included: true, value: decoded }
}

export const decodeItems = <T>(
  value: unknown,
  decoder: (item: unknown) => T | null,
): T[] | null => {
  if (!Array.isArray(value)) {
    return null
  }
  const decoded: T[] = []
  for (const item of value) {
    const result = decoder(item)
    if (result === null) {
      return null
    }
    decoded.push(result)
  }
  return decoded
}

export const decodeBrandRef = (
  value: unknown,
): RawSearchAutocompleteBrandRef | null => {
  if (!isRecord(value)) {
    return null
  }
  const handle = decodeRequiredString(value, "handle")
  const id = decodeRequiredString(value, "id")
  const title = decodeRequiredString(value, "title")
  return handle === null || id === null || title === null
    ? null
    : { handle, id, title }
}

export const decodeCategoryRef = (
  value: unknown,
): RawSearchAutocompleteCategoryRef | null => {
  if (!isRecord(value)) {
    return null
  }
  const handle = decodeRequiredString(value, "handle")
  const id = decodeRequiredString(value, "id")
  const name = decodeRequiredString(value, "name")
  return handle === null || id === null || name === null
    ? null
    : { handle, id, name }
}

const decodeSafeLocalHref = (value: unknown) => {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return null
  }
  for (const character of value) {
    const codePoint = character.codePointAt(0)
    if (codePoint === undefined || codePoint < 32) {
      return null
    }
  }
  return value
}

export const decodeContentHit = (
  value: unknown,
): RawSearchAutocompleteContentHit | null => {
  if (!isRecord(value)) {
    return null
  }
  const excerpt = decodeOptional(value, "excerpt", decodeString)
  const href = decodeSafeLocalHref(getRecordValue(value, "href"))
  const id = decodeRequiredString(value, "id")
  const title = decodeRequiredString(value, "title")
  const type = decodeOptional(value, "type", decodeString)
  if (excerpt === null || href === null || id === null) {
    return null
  }
  if (title === null || type === null) {
    return null
  }
  return {
    ...(excerpt.included ? { excerpt: excerpt.value } : {}),
    href,
    id,
    title,
    ...(type.included ? { type: type.value } : {}),
  }
}

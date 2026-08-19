import {
  MAX_URL_REGISTRY_INVALIDATION_TAG_LENGTH,
  MAX_URL_REGISTRY_INVALIDATION_TAGS,
} from "../invalidation-tags"

const DELIVERY_KEYS = ["outboxEventId", "schemaVersion", "tags"] as const
const IDENTIFIER_PATTERN = /^[\x21-\x7e]{1,255}$/
const TAG_PATTERN = /^[a-z][a-z0-9-]*(?::[\x21-\x7e]+)+$/

export type UrlRegistryInvalidationDeliveryV1 = Readonly<{
  outboxEventId: string
  schemaVersion: 1
  tags: readonly string[]
}>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const hasExactKeys = (value: Record<string, unknown>): boolean => {
  const keys = Object.keys(value).sort()
  return (
    keys.length === DELIVERY_KEYS.length &&
    keys.every((key, index) => key === DELIVERY_KEYS[index])
  )
}

const isValidTag = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= MAX_URL_REGISTRY_INVALIDATION_TAG_LENGTH &&
  TAG_PATTERN.test(value)

const isSortedUnique = (values: readonly string[]): boolean =>
  values.every((value, index) => index === 0 || values[index - 1] < value)

export const parseUrlRegistryInvalidationDeliveryV1 = (
  value: unknown
): UrlRegistryInvalidationDeliveryV1 | null => {
  if (!(isRecord(value) && hasExactKeys(value))) {
    return null
  }
  if (
    value.schemaVersion !== 1 ||
    typeof value.outboxEventId !== "string" ||
    !IDENTIFIER_PATTERN.test(value.outboxEventId) ||
    !Array.isArray(value.tags) ||
    value.tags.length < 1 ||
    value.tags.length > MAX_URL_REGISTRY_INVALIDATION_TAGS ||
    !value.tags.every(isValidTag) ||
    !isSortedUnique(value.tags)
  ) {
    return null
  }

  return Object.freeze({
    outboxEventId: value.outboxEventId,
    schemaVersion: 1,
    tags: Object.freeze([...value.tags]),
  })
}

export const parseUrlRegistryInvalidationDeliveryJson = (
  json: string
): UrlRegistryInvalidationDeliveryV1 | null => {
  try {
    return parseUrlRegistryInvalidationDeliveryV1(JSON.parse(json))
  } catch {
    return null
  }
}

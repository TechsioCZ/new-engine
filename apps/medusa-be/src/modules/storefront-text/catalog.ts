import csCZ from "./messages/cs-CZ.json"
import huHU from "./messages/hu-HU.json"
import roRO from "./messages/ro-RO.json"
import skSK from "./messages/sk-SK.json"
import type {
  StorefrontTextLocale,
  StorefrontTextMarket,
} from "./configuration"
import { validateStorefrontTextOverride } from "./message-validation"

export type StorefrontTextCatalog = {
  [key: string]: StorefrontTextCatalog | string
}

export const STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION = 1 as const

export type StorefrontTextCatalogEnvelope = {
  locale: StorefrontTextLocale
  market: StorefrontTextMarket
  messages: StorefrontTextCatalog
  schema_version: typeof STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION
}

const RESERVED_CATALOG_SEGMENTS = new Set([
  "__proto__",
  "constructor",
  "prototype",
])

const isCatalogGroup = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isValidCatalogSegment = (segment: string) =>
  !!segment &&
  !segment.includes(".") &&
  !RESERVED_CATALOG_SEGMENTS.has(segment)

const createCatalogGroup = (): StorefrontTextCatalog =>
  Object.create(null) as StorefrontTextCatalog

const hasOwn = (value: object, key: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(value, key)

const flattenCatalogGroup = (
  catalog: unknown,
  parentKey: string,
  messages: Record<string, string>
) => {
  if (!isCatalogGroup(catalog)) {
    throw new Error("Storefront text catalog must be a JSON object")
  }

  for (const [key, value] of Object.entries(catalog)) {
    if (!isValidCatalogSegment(key)) {
      throw new Error(`Invalid storefront text catalog key "${key}"`)
    }

    const messageKey = parentKey ? `${parentKey}.${key}` : key

    if (typeof value === "string") {
      messages[messageKey] = value
      continue
    }

    if (!isCatalogGroup(value) || Object.keys(value).length === 0) {
      throw new Error(
        `Storefront text catalog value "${messageKey}" must be a string or non-empty object`
      )
    }

    flattenCatalogGroup(value, messageKey, messages)
  }
}

export const flattenStorefrontTextCatalog = (
  catalog: unknown
): Record<string, string> => {
  const messages = Object.create(null) as Record<string, string>
  flattenCatalogGroup(catalog, "", messages)
  return messages
}

export const nestStorefrontTextMessages = (
  messages: Record<string, string>
): StorefrontTextCatalog => {
  const catalog = createCatalogGroup()

  for (const [messageKey, value] of Object.entries(messages)) {
    const segments = messageKey.split(".")
    const leaf = segments.pop()

    if (
      !leaf ||
      !isValidCatalogSegment(leaf) ||
      segments.some((segment) => !isValidCatalogSegment(segment))
    ) {
      throw new Error(`Invalid storefront text message key "${messageKey}"`)
    }

    let group = catalog

    for (const segment of segments) {
      const existing = group[segment]

      if (typeof existing === "string") {
        throw new Error(
          `Storefront text message key "${messageKey}" conflicts with "${segment}"`
        )
      }

      if (existing) {
        group = existing
        continue
      }

      const nestedGroup = createCatalogGroup()
      group[segment] = nestedGroup
      group = nestedGroup
    }

    if (hasOwn(group, leaf)) {
      throw new Error(`Duplicate storefront text message key "${messageKey}"`)
    }

    group[leaf] = value
  }

  return catalog
}

const CATALOGS_BY_LOCALE = {
  "cs-CZ": csCZ,
  "hu-HU": huHU,
  "ro-RO": roRO,
  "sk-SK": skSK,
} satisfies Record<StorefrontTextLocale, unknown>

const FLAT_CATALOGS_BY_LOCALE: Record<
  StorefrontTextLocale,
  Record<string, string>
> = {
  "cs-CZ": flattenStorefrontTextCatalog(CATALOGS_BY_LOCALE["cs-CZ"]),
  "hu-HU": flattenStorefrontTextCatalog(CATALOGS_BY_LOCALE["hu-HU"]),
  "ro-RO": flattenStorefrontTextCatalog(CATALOGS_BY_LOCALE["ro-RO"]),
  "sk-SK": flattenStorefrontTextCatalog(CATALOGS_BY_LOCALE["sk-SK"]),
}

export const getFlatStorefrontTextCatalog = (
  locale: StorefrontTextLocale
): Record<string, string> => FLAT_CATALOGS_BY_LOCALE[locale]

type PublishedStorefrontTextRecord = {
  key: string
  override_value: null | string
  status: string
}

export const getPublishedStorefrontTextValue = ({
  defaultValue,
  locale,
  record,
}: {
  defaultValue: string
  locale: StorefrontTextLocale
  record: PublishedStorefrontTextRecord
}) => {
  if (record.status !== "active" || record.override_value === null) {
    return defaultValue
  }

  const validation = validateStorefrontTextOverride({
    defaultValue,
    locale,
    overrideValue: record.override_value,
  })

  return validation.success ? record.override_value : defaultValue
}

export const getPublishedStorefrontTextMessages = (
  defaultMessages: Record<string, string>,
  records: PublishedStorefrontTextRecord[],
  locale: StorefrontTextLocale
) => {
  const messages = { ...defaultMessages }

  for (const record of records) {
    const defaultValue = defaultMessages[record.key]

    if (defaultValue !== undefined && hasOwn(defaultMessages, record.key)) {
      messages[record.key] = getPublishedStorefrontTextValue({
        defaultValue,
        locale,
        record,
      })
    }
  }

  return messages
}

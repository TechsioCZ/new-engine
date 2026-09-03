import type {
  ProductPublicationAssignment,
  UrlRegistryOutboxMarket,
} from "./types"
import {
  URL_REGISTRY_OUTBOX_MARKETS,
  UrlRegistryOutboxInputError,
} from "./types"

export const PRODUCT_PUBLICATION_METADATA_KEY =
  "url_registry_publication" as const

export type ProductPublicationSnapshot = Readonly<{
  assignments: Readonly<
    Record<UrlRegistryOutboxMarket, ProductPublicationAssignment | null>
  >
  productId: string
  sourceVersion: string
}>

export type ProductPublicationSnapshotOptions = Readonly<{
  unlinkedSalesChannelPolicy?: "reject" | "unpublish"
}>

const PUBLICATION_STATUSES = new Set(["draft", "published"])
const VISIBLE_ASCII = /^[\x21-\x7e]+$/
const PUBLIC_SLUG = /^(?=.*[a-z0-9])[a-z0-9-]+$/
const MAX_IDENTIFIER_LENGTH = 255
const MAX_SLUG_LENGTH = 255

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new UrlRegistryOutboxInputError(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (
  record: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  required: ReadonlySet<string>,
  label: string
) => {
  const unexpected = Object.keys(record).find((key) => !allowed.has(key))
  const missing = [...required].find((key) => !Object.hasOwn(record, key))
  if (unexpected || missing) {
    throw new UrlRegistryOutboxInputError(
      unexpected
        ? `${label} contains unexpected field ${unexpected}`
        : `${label} is missing field ${missing}`
    )
  }
}

const identifier = (value: unknown, label: string) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_IDENTIFIER_LENGTH ||
    !VISIBLE_ASCII.test(value)
  ) {
    throw new UrlRegistryOutboxInputError(`${label} is invalid`)
  }
  return value
}

const sourceVersion = (value: unknown) => {
  if (!(typeof value === "string" || value instanceof Date)) {
    throw new UrlRegistryOutboxInputError("product.updated_at is invalid")
  }
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    throw new UrlRegistryOutboxInputError("product.updated_at is invalid")
  }
  return timestamp.toISOString()
}

const assignment = (
  value: unknown,
  market: UrlRegistryOutboxMarket
): ProductPublicationAssignment => {
  const record = asRecord(value, `product publication ${market}`)
  exactKeys(
    record,
    new Set(["publicationStatus", "publicSlug", "salesChannelId"]),
    new Set(["publicationStatus", "publicSlug", "salesChannelId"]),
    `product publication ${market}`
  )
  if (
    typeof record.publicationStatus !== "string" ||
    !PUBLICATION_STATUSES.has(record.publicationStatus)
  ) {
    throw new UrlRegistryOutboxInputError(
      `product publication ${market}.publicationStatus is invalid`
    )
  }
  if (
    typeof record.publicSlug !== "string" ||
    record.publicSlug.length > MAX_SLUG_LENGTH ||
    !PUBLIC_SLUG.test(record.publicSlug)
  ) {
    throw new UrlRegistryOutboxInputError(
      `product publication ${market}.publicSlug is invalid`
    )
  }
  return {
    publicationStatus: record.publicationStatus as "draft" | "published",
    publicSlug: record.publicSlug,
    salesChannelId: identifier(
      record.salesChannelId,
      `product publication ${market}.salesChannelId`
    ),
  }
}

const linkedSalesChannelIds = (value: unknown): ReadonlySet<string> => {
  if (!Array.isArray(value)) {
    throw new UrlRegistryOutboxInputError(
      "product.sales_channels must be an array"
    )
  }
  return new Set(
    value.map((candidate, index) => {
      const record = asRecord(candidate, `product.sales_channels[${index}]`)
      return identifier(record.id, `product.sales_channels[${index}].id`)
    })
  )
}

const emptyAssignments = () =>
  Object.fromEntries(
    URL_REGISTRY_OUTBOX_MARKETS.map((market) => [market, null])
  ) as Record<UrlRegistryOutboxMarket, ProductPublicationAssignment | null>

const parseAssignments = (
  publication: unknown,
  channels: ReadonlySet<string>,
  options: ProductPublicationSnapshotOptions
) => {
  const assignments = emptyAssignments()
  if (publication === undefined || publication === null) {
    return assignments
  }
  const contract = asRecord(publication, PRODUCT_PUBLICATION_METADATA_KEY)
  exactKeys(
    contract,
    new Set(["markets", "schemaVersion"]),
    new Set(["markets", "schemaVersion"]),
    PRODUCT_PUBLICATION_METADATA_KEY
  )
  if (contract.schemaVersion !== 1) {
    throw new UrlRegistryOutboxInputError(
      `${PRODUCT_PUBLICATION_METADATA_KEY}.schemaVersion is invalid`
    )
  }
  const markets = asRecord(
    contract.markets,
    `${PRODUCT_PUBLICATION_METADATA_KEY}.markets`
  )
  exactKeys(
    markets,
    new Set(URL_REGISTRY_OUTBOX_MARKETS),
    new Set(),
    `${PRODUCT_PUBLICATION_METADATA_KEY}.markets`
  )
  const assignedChannels = new Set<string>()
  for (const market of URL_REGISTRY_OUTBOX_MARKETS) {
    if (!Object.hasOwn(markets, market)) {
      continue
    }
    const parsed = assignment(markets[market], market)
    if (!channels.has(parsed.salesChannelId)) {
      if (options.unlinkedSalesChannelPolicy === "unpublish") {
        continue
      }
      throw new UrlRegistryOutboxInputError(
        `product publication ${market} references an unlinked sales channel`
      )
    }
    if (assignedChannels.has(parsed.salesChannelId)) {
      throw new UrlRegistryOutboxInputError(
        "a sales channel cannot be assigned to more than one market"
      )
    }
    assignedChannels.add(parsed.salesChannelId)
    assignments[market] = parsed
  }
  return assignments
}

export const parseProductPublicationSnapshot = (
  value: unknown,
  options: ProductPublicationSnapshotOptions = {}
): ProductPublicationSnapshot => {
  const product = asRecord(value, "product")
  const productId = identifier(product.id, "product.id")
  const channels = linkedSalesChannelIds(product.sales_channels)
  const metadata =
    product.metadata === null || product.metadata === undefined
      ? null
      : asRecord(product.metadata, "product.metadata")
  const publication = metadata?.[PRODUCT_PUBLICATION_METADATA_KEY]
  return {
    assignments: parseAssignments(publication, channels, options),
    productId,
    sourceVersion: sourceVersion(product.updated_at),
  }
}

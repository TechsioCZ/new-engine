import { z } from "@medusajs/framework/zod"
import type { StorefrontUrlAssignmentRecord } from "./models/storefront-url-assignment"

export const COLLECTION_URL_ASSIGNMENT_SCHEMA_VERSION = 1 as const
export const STOREFRONT_URL_ASSIGNMENT_ENTITY_KINDS = [
  "category",
  "brand",
  "collection",
] as const
export type StorefrontUrlAssignmentEntityKind =
  (typeof STOREFRONT_URL_ASSIGNMENT_ENTITY_KINDS)[number]
export const COLLECTION_URL_ASSIGNMENT_MARKETS = [
  "sk",
  "cz",
  "hu",
  "ro",
] as const
export const COLLECTION_URL_ASSIGNMENT_STATUSES = [
  "draft",
  "published",
] as const
export const COLLECTION_URL_ASSIGNMENT_MAX_PAGE_SIZE = 100

const publicSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^(?=.*[a-z0-9])[a-z0-9-]+$/)
const CANONICAL_NON_NEGATIVE_INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/

export const AdminUpsertCollectionUrlAssignmentSchema = z
  .object({
    marketCode: z.enum(COLLECTION_URL_ASSIGNMENT_MARKETS),
    salesChannelId: z.string().trim().min(1).max(255),
    publicSlug: publicSlugSchema,
    publicationStatus: z.enum(COLLECTION_URL_ASSIGNMENT_STATUSES),
  })
  .strict()

export type AdminUpsertCollectionUrlAssignment = z.infer<
  typeof AdminUpsertCollectionUrlAssignmentSchema
>

export type CollectionUrlAssignmentResponse = {
  schemaVersion: typeof COLLECTION_URL_ASSIGNMENT_SCHEMA_VERSION
  id: string
  entityId: string
  marketCode: (typeof COLLECTION_URL_ASSIGNMENT_MARKETS)[number]
  salesChannelId: string
  publicSlug: string
  publicationStatus: (typeof COLLECTION_URL_ASSIGNMENT_STATUSES)[number]
  sourceVersion: string
}

export class InvalidCollectionUrlAssignmentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InvalidCollectionUrlAssignmentError"
  }
}

const assertNonEmptyText = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidCollectionUrlAssignmentError(`${field} must be text`)
  }
  return value
}

export const serializeStorefrontUrlAssignment = (
  record: StorefrontUrlAssignmentRecord,
  expectedEntityKind: StorefrontUrlAssignmentEntityKind
): CollectionUrlAssignmentResponse => {
  const marketCode = z
    .enum(COLLECTION_URL_ASSIGNMENT_MARKETS)
    .safeParse(record.market_code)
  const publicationStatus = z
    .enum(COLLECTION_URL_ASSIGNMENT_STATUSES)
    .safeParse(record.publication_status)

  if (
    record.schema_version !== COLLECTION_URL_ASSIGNMENT_SCHEMA_VERSION ||
    record.entity_kind !== expectedEntityKind ||
    !marketCode.success ||
    !publicationStatus.success ||
    !Number.isSafeInteger(record.source_version) ||
    record.source_version < 1
  ) {
    throw new InvalidCollectionUrlAssignmentError(
      "Collection URL assignment contains an unsupported state"
    )
  }

  const publicSlug = publicSlugSchema.safeParse(record.public_slug)
  if (!publicSlug.success) {
    throw new InvalidCollectionUrlAssignmentError(
      "Collection URL assignment contains an invalid public slug"
    )
  }

  return {
    schemaVersion: COLLECTION_URL_ASSIGNMENT_SCHEMA_VERSION,
    id: assertNonEmptyText(record.entity_id, "entity_id"),
    entityId: assertNonEmptyText(record.entity_id, "entity_id"),
    marketCode: marketCode.data,
    salesChannelId: assertNonEmptyText(
      record.sales_channel_id,
      "sales_channel_id"
    ),
    publicSlug: publicSlug.data,
    publicationStatus: publicationStatus.data,
    sourceVersion: String(record.source_version),
  }
}

export const serializeCollectionUrlAssignment = (
  record: StorefrontUrlAssignmentRecord
): CollectionUrlAssignmentResponse =>
  serializeStorefrontUrlAssignment(record, "collection")

export const resolvePublishableKeySalesChannelId = (
  salesChannelIds: readonly unknown[] | undefined
): string => {
  if (!salesChannelIds) {
    throw new InvalidCollectionUrlAssignmentError(
      "Publishable-key Sales Channel scope is missing"
    )
  }

  const uniqueIds = [
    ...new Set(
      salesChannelIds.filter(
        (value): value is string =>
          typeof value === "string" && value.trim() !== ""
      )
    ),
  ]

  if (uniqueIds.length !== 1) {
    throw new InvalidCollectionUrlAssignmentError(
      "Publishable key must authorize exactly one Sales Channel"
    )
  }

  return uniqueIds[0] ?? ""
}

export const assertSingleAssignmentMarket = (
  assignments: readonly CollectionUrlAssignmentResponse[]
): void => {
  if (
    new Set(assignments.map((assignment) => assignment.marketCode)).size > 1
  ) {
    throw new InvalidCollectionUrlAssignmentError(
      "Sales Channel resolves to multiple collection-assignment markets"
    )
  }
}

export const parseCollectionAssignmentPage = (query: {
  limit?: unknown
  offset?: unknown
}): { limit: number; offset: number } => {
  const parseInteger = (
    value: unknown,
    fallback: number,
    minimum: number,
    maximum: number
  ) => {
    if (value === undefined) {
      return fallback
    }
    if (
      typeof value !== "string" ||
      !CANONICAL_NON_NEGATIVE_INTEGER_PATTERN.test(value)
    ) {
      throw new InvalidCollectionUrlAssignmentError(
        "Pagination values must be canonical non-negative integers"
      )
    }
    const parsed = Number(value)
    if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
      throw new InvalidCollectionUrlAssignmentError(
        "Pagination value is outside the supported range"
      )
    }
    return parsed
  }

  return {
    limit: parseInteger(
      query.limit,
      50,
      1,
      COLLECTION_URL_ASSIGNMENT_MAX_PAGE_SIZE
    ),
    offset: parseInteger(query.offset, 0, 0, Number.MAX_SAFE_INTEGER),
  }
}

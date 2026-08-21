import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import type { Market } from "@/lib/url/types"
import type { SourceReadResult } from "@/lib/url-registry/contracts"

export type CatalogPublicationKind = "brand" | "category" | "collection"

type CatalogPublicationBinding = Pick<
  MarketRuntimeBinding,
  "locale" | "market" | "salesChannelId"
>

export type CatalogPublicationProofRequest = Readonly<{
  entityId: string
  entityKind: CatalogPublicationKind
  market: Market
  publicSlug: string
  sourceVersion: string
}>

export type CatalogPublicationProof = Readonly<{
  entityId: string
  entityKind: CatalogPublicationKind
  marketCode: Market
  publicSlug: string
  sourceVersion: string
  translationId: string
}>

export type CatalogPublicationProofDependencies = Readonly<{
  resolveMarket(market: Market): CatalogPublicationBinding | null
  retrieveAssignments(input: {
    binding: CatalogPublicationBinding
    request: CatalogPublicationProofRequest
  }): Promise<unknown>
}>

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])
const SOURCE_VERSION = /^[1-9]\d*$/
const VISIBLE_IDENTIFIER = /^[\x21-\x7e]{1,255}$/
const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const TRANSLATION_REFERENCE = {
  brand: "brand",
  category: "product_category",
  collection: "product_collection",
} as const satisfies Record<CatalogPublicationKind, string>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const invalid = (causeCode: string): SourceReadResult<never> => ({
  causeCode,
  kind: "invalid-response",
})

const isValidRequest = (request: CatalogPublicationProofRequest) =>
  typeof request.entityId === "string" &&
  VISIBLE_IDENTIFIER.test(request.entityId) &&
  typeof request.publicSlug === "string" &&
  PUBLIC_SLUG.test(request.publicSlug) &&
  request.publicSlug.length <= 80 &&
  typeof request.sourceVersion === "string" &&
  SOURCE_VERSION.test(request.sourceVersion)

const readAssignment = (
  value: unknown,
  binding: CatalogPublicationBinding,
  request: CatalogPublicationProofRequest
): SourceReadResult<CatalogPublicationProof> => {
  if (!(isRecord(value) && isRecord(value.translation))) {
    return invalid("INVALID_CATALOG_PUBLICATION_ASSIGNMENT")
  }
  if (
    value.schemaVersion !== 1 ||
    value.id !== request.entityId ||
    value.entityId !== request.entityId ||
    value.marketCode !== request.market ||
    value.salesChannelId !== binding.salesChannelId ||
    value.publicationStatus !== "published" ||
    value.publicSlug !== request.publicSlug ||
    value.sourceVersion !== request.sourceVersion ||
    value.translation.localeCode !== binding.locale ||
    value.translation.reference !== TRANSLATION_REFERENCE[request.entityKind] ||
    typeof value.translation.translationId !== "string" ||
    !VISIBLE_IDENTIFIER.test(value.translation.translationId)
  ) {
    return invalid("CATALOG_PUBLICATION_PROOF_MISMATCH")
  }
  return {
    kind: "found",
    value: {
      entityId: request.entityId,
      entityKind: request.entityKind,
      marketCode: request.market,
      publicSlug: request.publicSlug,
      sourceVersion: request.sourceVersion,
      translationId: value.translation.translationId as string,
    },
  }
}

const parseResponse = (
  value: unknown,
  binding: CatalogPublicationBinding,
  request: CatalogPublicationProofRequest
): SourceReadResult<CatalogPublicationProof> => {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.marketCode !== request.market ||
    value.entityKind !== request.entityKind ||
    !Array.isArray(value.assignments)
  ) {
    return invalid("INVALID_CATALOG_PUBLICATION_RESPONSE")
  }
  if (value.assignments.length === 0) {
    return { kind: "missing" }
  }
  if (value.assignments.length !== 1) {
    return invalid("DUPLICATE_CATALOG_PUBLICATION_ASSIGNMENT")
  }
  return readAssignment(value.assignments[0], binding, request)
}

const statusOf = (error: unknown) =>
  isRecord(error) && typeof error.status === "number" ? error.status : null

export const readCatalogPublicationProof = async (
  request: CatalogPublicationProofRequest,
  dependencies: CatalogPublicationProofDependencies
): Promise<SourceReadResult<CatalogPublicationProof>> => {
  if (!isValidRequest(request)) {
    return invalid("INVALID_CATALOG_PUBLICATION_CANDIDATE")
  }

  let binding: CatalogPublicationBinding | null
  try {
    binding = dependencies.resolveMarket(request.market)
  } catch {
    return { kind: "unavailable" }
  }
  if (
    !binding ||
    binding.market !== request.market ||
    !VISIBLE_IDENTIFIER.test(binding.salesChannelId) ||
    typeof binding.locale !== "string" ||
    binding.locale.length === 0
  ) {
    return invalid("INVALID_CATALOG_PUBLICATION_MARKET_BINDING")
  }

  try {
    return parseResponse(
      await dependencies.retrieveAssignments({ binding, request }),
      binding,
      request
    )
  } catch (error) {
    const status = statusOf(error)
    if (status === 404) {
      return { kind: "missing" }
    }
    return status !== null && RETRYABLE_STATUSES.has(status)
      ? { kind: "unavailable" }
      : invalid("MEDUSA_REJECTED_CATALOG_PUBLICATION_REQUEST")
  }
}

import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import type { CatalogLifecycleDeliveryV1 } from "./catalog-lifecycle-parser"
import type { SourceReadResult } from "./contracts"

type CatalogLifecycleMarketBinding = Pick<
  MarketRuntimeBinding,
  "locale" | "market" | "publishableApiKey" | "salesChannelId"
>

export type CatalogLifecycleSourceDependencies = Readonly<{
  resolveMarket(
    market: CatalogLifecycleDeliveryV1["marketCode"]
  ): CatalogLifecycleMarketBinding | null
  retrieveSource(input: {
    binding: CatalogLifecycleMarketBinding
    delivery: CatalogLifecycleDeliveryV1
  }): Promise<unknown>
}>

const TRANSLATION_REFERENCE = {
  brand: "brand",
  category: "product_category",
  collection: "product_collection",
} as const
const VISIBLE_ASCII = /^[\x21-\x7e]{1,255}$/
const DECIMAL_SOURCE_VERSION = /^(?:0|[1-9]\d*)$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const isIdentifier = (value: unknown): value is string =>
  typeof value === "string" && VISIBLE_ASCII.test(value)

const invalid = (causeCode: string): SourceReadResult<unknown> => ({
  kind: "invalid-response",
  causeCode,
})

const sourceHasAdvanced = (current: unknown, delivered: string): boolean =>
  typeof current === "string" &&
  DECIMAL_SOURCE_VERSION.test(current) &&
  DECIMAL_SOURCE_VERSION.test(delivered) &&
  BigInt(current) > BigInt(delivered)

const parseSource = (
  payload: unknown,
  binding: CatalogLifecycleMarketBinding,
  delivery: CatalogLifecycleDeliveryV1
): SourceReadResult<unknown> => {
  if (
    !isRecord(payload) ||
    payload.schemaVersion !== 1 ||
    payload.entityKind !== delivery.entityKind ||
    payload.marketCode !== delivery.marketCode ||
    !Array.isArray(payload.assignments)
  ) {
    return invalid("INVALID_CATALOG_SOURCE_RESPONSE")
  }
  if (payload.assignments.length === 0) {
    return { kind: "missing" }
  }
  if (payload.assignments.length !== 1) {
    return invalid("DUPLICATE_CATALOG_SOURCE_ASSIGNMENT")
  }
  const assignment = payload.assignments[0]
  const expected = delivery.payload.assignment
  if (!(isRecord(assignment) && expected && isRecord(assignment.translation))) {
    return invalid("INVALID_CATALOG_SOURCE_ASSIGNMENT")
  }
  if (
    assignment.schemaVersion !== 1 ||
    assignment.id !== delivery.entityId ||
    assignment.entityId !== delivery.entityId ||
    assignment.marketCode !== delivery.marketCode ||
    assignment.publicationStatus !== "published" ||
    assignment.publicSlug !== expected.publicSlug ||
    assignment.salesChannelId !== binding.salesChannelId ||
    assignment.salesChannelId !== expected.salesChannelId ||
    !isIdentifier(assignment.translation.translationId) ||
    assignment.translation.localeCode !== binding.locale ||
    assignment.translation.reference !==
      TRANSLATION_REFERENCE[delivery.entityKind]
  ) {
    return invalid("CATALOG_SOURCE_PROOF_MISMATCH")
  }
  if (assignment.sourceVersion !== delivery.payload.sourceVersion) {
    return sourceHasAdvanced(
      assignment.sourceVersion,
      delivery.payload.sourceVersion
    )
      ? { kind: "missing" }
      : invalid("CATALOG_SOURCE_PROOF_MISMATCH")
  }
  return { kind: "found", value: assignment }
}

const errorStatus = (error: unknown) =>
  isRecord(error) && typeof error.status === "number" ? error.status : null

export const readCatalogLifecycleSource = async (
  delivery: CatalogLifecycleDeliveryV1,
  dependencies: CatalogLifecycleSourceDependencies
): Promise<SourceReadResult<unknown>> => {
  let binding: CatalogLifecycleMarketBinding | null
  try {
    binding = dependencies.resolveMarket(delivery.marketCode)
  } catch {
    return { kind: "unavailable" }
  }
  if (
    !binding ||
    binding.market !== delivery.marketCode ||
    !isIdentifier(binding.publishableApiKey) ||
    !isIdentifier(binding.salesChannelId) ||
    typeof binding.locale !== "string" ||
    binding.locale.length === 0
  ) {
    return invalid("INVALID_CATALOG_MARKET_BINDING")
  }
  try {
    return parseSource(
      await dependencies.retrieveSource({ binding, delivery }),
      binding,
      delivery
    )
  } catch (error) {
    const status = errorStatus(error)
    return status === 400 || status === 401 || status === 403
      ? invalid("CATALOG_SOURCE_REJECTED_REQUEST")
      : { kind: "unavailable" }
  }
}

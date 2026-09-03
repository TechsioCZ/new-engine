import { MedusaError } from "@medusajs/framework/utils"

export const MARKET_VARIANT_AVAILABILITIES = [
  "sellable",
  "unavailable",
] as const

export type MarketVariantAvailability =
  (typeof MARKET_VARIANT_AVAILABILITIES)[number]

export type MarketVariantAuthorityProvenance = Record<string, unknown>

export type MarketVariantAuthorityRecord = {
  approval_provenance: MarketVariantAuthorityProvenance
  authority_sha256: string
  availability: MarketVariantAvailability | string
  deleted_at?: Date | string | null
  id?: string
  market_code: string
  product_id: string
  source_provenance: MarketVariantAuthorityProvenance
  source_version: string
  variant_id: string
}

export type MarketVariantAuthorityEntryInput = {
  approvalProvenance: MarketVariantAuthorityProvenance
  availability: MarketVariantAvailability
  productId: string
  sourceProvenance: MarketVariantAuthorityProvenance
  variantId: string
}

export type MarketVariantAuthorityEnvelopeInput = {
  authoritySha256: string
  entries: MarketVariantAuthorityEntryInput[]
  marketCode: string
  sourceVersion: string
}

export type NormalizedMarketVariantAuthorityEntry = {
  approval_provenance: MarketVariantAuthorityProvenance
  authority_sha256: string
  availability: MarketVariantAvailability
  market_code: string
  product_id: string
  source_provenance: MarketVariantAuthorityProvenance
  source_version: string
  variant_id: string
}

export type ResolveExactMarketVariantAuthorityInput = {
  authoritySha256: string
  marketCode: string
  productId: string
  records: readonly MarketVariantAuthorityRecord[]
  sourceVersion?: string
  variantIds: readonly string[]
}

export type ResolvedExactMarketVariantAuthority = {
  authoritySha256: string
  byVariantId: ReadonlyMap<string, MarketVariantAuthorityRecord>
  marketCode: string
  productId: string
  sellableVariantIds: ReadonlySet<string>
  sourceVersion: string
  unavailableVariantIds: ReadonlySet<string>
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/
const MARKET_CODE_PATTERN = /^[a-z]{2}$/

const invalidData = (message: string): never => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
}

const unexpectedState = (message: string): never => {
  throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
}

const nonEmptyText = (value: string, field: string) => {
  const normalized = value.trim()
  if (!normalized) {
    invalidData(`${field} must be a non-empty string`)
  }
  return normalized
}

const marketCode = (value: string) => {
  const normalized = nonEmptyText(value, "marketCode").toLowerCase()
  if (!MARKET_CODE_PATTERN.test(normalized)) {
    invalidData("marketCode must be a two-letter lowercase market code")
  }
  return normalized
}

const authoritySha256 = (value: string) => {
  const normalized = nonEmptyText(value, "authoritySha256").toLowerCase()
  if (!SHA256_PATTERN.test(normalized)) {
    invalidData("authoritySha256 must be a lowercase SHA-256 digest")
  }
  return normalized
}

const canonicalJsonValue = (value: unknown, field: string): unknown => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      invalidData(`${field} must contain only finite JSON numbers`)
    }
    return value
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      canonicalJsonValue(entry, `${field}[${index}]`)
    )
  }
  if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value)
    if (!(prototype === Object.prototype || prototype === null)) {
      invalidData(`${field} must contain only JSON values`)
    }
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [
          key,
          canonicalJsonValue(
            (value as Record<string, unknown>)[key],
            `${field}.${key}`
          ),
        ])
    )
  }
  return invalidData(`${field} must contain only JSON values`)
}

const provenance = (value: MarketVariantAuthorityProvenance, field: string) => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length === 0
  ) {
    invalidData(`${field} must be a non-empty JSON object`)
  }
  return canonicalJsonValue(value, field) as MarketVariantAuthorityProvenance
}

export const canonicalizeMarketVariantAuthorityProvenance = (
  value: MarketVariantAuthorityProvenance,
  field = "provenance"
) => provenance(value, field)

const availability = (value: string): MarketVariantAvailability => {
  if (
    !MARKET_VARIANT_AVAILABILITIES.includes(value as MarketVariantAvailability)
  ) {
    unexpectedState(`Unsupported market variant availability: ${value}`)
  }
  return value as MarketVariantAvailability
}

const identityKey = (productId: string, variantId: string) =>
  `${productId}\u0000${variantId}`

const resolveExpectedIdentity = (
  input: ResolveExactMarketVariantAuthorityInput
) => {
  const variantIds = input.variantIds.map((variantId, index) =>
    nonEmptyText(variantId, `variantIds[${index}]`)
  )
  const variants = new Set(variantIds)
  if (variants.size !== variantIds.length) {
    invalidData("variantIds must contain each expected variant exactly once")
  }
  if (variants.size === 0) {
    invalidData("variantIds must contain at least one expected variant")
  }

  return {
    authoritySha256: authoritySha256(input.authoritySha256),
    marketCode: marketCode(input.marketCode),
    productId: nonEmptyText(input.productId, "productId"),
    sourceVersion:
      input.sourceVersion === undefined
        ? undefined
        : nonEmptyText(input.sourceVersion, "sourceVersion"),
    variantIds,
    variants,
  }
}

const assertExactRecord = (
  record: MarketVariantAuthorityRecord,
  expected: ReturnType<typeof resolveExpectedIdentity>
) => {
  if (record.deleted_at != null) {
    unexpectedState(
      `Retired market variant authority was supplied for ${record.product_id}/${record.variant_id}`
    )
  }
  if (
    record.market_code !== expected.marketCode ||
    record.product_id !== expected.productId
  ) {
    unexpectedState(
      `Unexpected market variant authority identity ${record.market_code}/${record.product_id}/${record.variant_id}`
    )
  }
  if (!expected.variants.has(record.variant_id)) {
    unexpectedState(
      `Unexpected market variant authority variant ${record.variant_id}`
    )
  }
  if (record.authority_sha256 !== expected.authoritySha256) {
    unexpectedState(
      `Market variant authority hash mismatch for ${expected.productId}/${record.variant_id}`
    )
  }
  if (
    expected.sourceVersion &&
    record.source_version !== expected.sourceVersion
  ) {
    unexpectedState(
      `Market variant authority source version mismatch for ${expected.productId}/${record.variant_id}`
    )
  }
  const normalizedSourceVersion = nonEmptyText(
    record.source_version,
    "source_version"
  )
  if (record.source_version !== normalizedSourceVersion) {
    unexpectedState(
      `Non-canonical market variant authority source version for ${expected.productId}/${record.variant_id}`
    )
  }
  provenance(record.approval_provenance, "approval_provenance")
  provenance(record.source_provenance, "source_provenance")
  availability(record.availability)
}

export const normalizeMarketVariantAuthorityEnvelope = (
  input: MarketVariantAuthorityEnvelopeInput
): {
  authoritySha256: string
  entries: NormalizedMarketVariantAuthorityEntry[]
  marketCode: string
  sourceVersion: string
} => {
  const normalizedMarketCode = marketCode(input.marketCode)
  const normalizedAuthoritySha256 = authoritySha256(input.authoritySha256)
  const normalizedSourceVersion = nonEmptyText(
    input.sourceVersion,
    "sourceVersion"
  )
  const identities = new Set<string>()
  const entries = input.entries.map((entry, index) => {
    const productId = nonEmptyText(
      entry.productId,
      `entries[${index}].productId`
    )
    const variantId = nonEmptyText(
      entry.variantId,
      `entries[${index}].variantId`
    )
    const key = identityKey(productId, variantId)
    if (identities.has(key)) {
      invalidData(
        `Duplicate market variant authority input for ${productId}/${variantId}`
      )
    }
    identities.add(key)

    return {
      approval_provenance: provenance(
        entry.approvalProvenance,
        `entries[${index}].approvalProvenance`
      ),
      authority_sha256: normalizedAuthoritySha256,
      availability: availability(entry.availability),
      market_code: normalizedMarketCode,
      product_id: productId,
      source_provenance: provenance(
        entry.sourceProvenance,
        `entries[${index}].sourceProvenance`
      ),
      source_version: normalizedSourceVersion,
      variant_id: variantId,
    }
  })

  if (entries.length === 0) {
    invalidData("entries must contain at least one market variant authority")
  }

  return {
    authoritySha256: normalizedAuthoritySha256,
    entries,
    marketCode: normalizedMarketCode,
    sourceVersion: normalizedSourceVersion,
  }
}

export const resolveExactMarketVariantAuthority = (
  input: ResolveExactMarketVariantAuthorityInput
): ResolvedExactMarketVariantAuthority => {
  const expected = resolveExpectedIdentity(input)
  const byVariantId = new Map<string, MarketVariantAuthorityRecord>()
  for (const record of input.records) {
    assertExactRecord(record, expected)
    if (byVariantId.has(record.variant_id)) {
      unexpectedState(
        `Duplicate current market variant authority for ${expected.productId}/${record.variant_id}`
      )
    }
    byVariantId.set(record.variant_id, record)
  }

  const missingVariantIds = expected.variantIds.filter(
    (variantId) => !byVariantId.has(variantId)
  )
  if (missingVariantIds.length) {
    unexpectedState(
      `Missing current market variant authority for ${expected.productId}: ${missingVariantIds.join(", ")}`
    )
  }

  const sourceVersions = new Set(
    [...byVariantId.values()].map((record) => record.source_version)
  )
  if (sourceVersions.size !== 1) {
    unexpectedState(
      `Mixed market variant authority source versions for ${expected.productId}`
    )
  }
  const [resolvedSourceVersion] = sourceVersions
  if (!resolvedSourceVersion) {
    return unexpectedState(
      `Missing market variant authority source version for ${expected.productId}`
    )
  }

  const sellableVariantIds = new Set<string>()
  const unavailableVariantIds = new Set<string>()
  for (const [variantId, record] of byVariantId) {
    if (record.availability === "sellable") {
      sellableVariantIds.add(variantId)
    } else {
      unavailableVariantIds.add(variantId)
    }
  }

  return {
    authoritySha256: expected.authoritySha256,
    byVariantId,
    marketCode: expected.marketCode,
    productId: expected.productId,
    sellableVariantIds,
    sourceVersion: resolvedSourceVersion,
    unavailableVariantIds,
  }
}

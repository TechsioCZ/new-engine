import { createHash } from "node:crypto"
import { isPositiveCanonicalPriceAmount } from "./price-amount"
import {
  COMMERCE_MARKET_CONTRACTS,
  COMMERCE_READINESS_MARKETS,
  type FourMarketCommerceReadinessInput,
  type FourMarketCommerceReadinessProof,
  type MarketCommerceReadinessContext,
  type MarketCommerceReadinessInput,
  type MarketCommerceReadinessProof,
  type SharedCatalogInput,
  type SharedCommerceReadinessProof,
  type SharedInventoryInput,
} from "./types"

const SHA_256 = /^[a-f0-9]{64}$/
export const CHECKOUT_CANARY_MAX_AGE_MS = 15 * 60 * 1000

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`
  }
  const encoded = JSON.stringify(value)
  if (encoded === undefined) {
    throw new Error("commerce readiness artifacts cannot contain undefined")
  }
  return encoded
}

const sha256 = (bytes: string) =>
  createHash("sha256").update(bytes).digest("hex")

export const serializeCanonicalCommerceArtifact = (value: unknown) =>
  `${canonicalJson(value)}\n`

export const sha256CommerceArtifactBytes = (bytes: string) => sha256(bytes)

const sortedUnique = (values: readonly string[]) =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right))

const hasDuplicates = (values: readonly string[]) =>
  new Set(values).size !== values.length

const validIdentifier = (value: string) =>
  value.trim() === value && value !== ""

const validTimestamp = (value: string) => {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
}

const isCheckoutCanaryFresh = (checkedAt: string, capturedAt: string) => {
  const age = Date.parse(capturedAt) - Date.parse(checkedAt)
  return age >= 0 && age <= CHECKOUT_CANARY_MAX_AGE_MS
}

const MARKET_PROOF_KEYS = [
  "approvedPriceAuthoritySha256",
  "approvedVariantPriceCount",
  "checkoutCanary",
  "capturedAt",
  "countryCode",
  "currencyCode",
  "issues",
  "kind",
  "locale",
  "market",
  "paymentProviderIds",
  "publishedVariantCount",
  "publishedVariantIds",
  "ready",
  "regionId",
  "salesChannelId",
  "schemaVersion",
  "sellableVariantCount",
  "sellableVariantIds",
  "sharedCatalog",
  "sharedInventory",
  "shippingOptionIds",
  "taxRateIds",
  "taxRegionId",
  "unavailableVariantCount",
  "unavailableVariants",
] as const

const CHECKOUT_CANARY_KEYS = [
  "artifactKind",
  "checkedAt",
  "countryCode",
  "currencyCode",
  "enabledPaymentAvailable",
  "mutationPolicy",
  "orderId",
  "paymentCollectionId",
  "paymentSessionId",
  "releaseIdentity",
  "regionId",
  "salesChannelId",
  "schemaVersion",
  "shippingAvailable",
  "taxAvailable",
  "variantId",
] as const

const RELEASE_IDENTITY_KEYS = [
  "backendBuildHash",
  "backendDeploymentId",
  "backendReleaseSha",
  "backendSlot",
  "databaseInstanceFingerprint",
  "environmentId",
  "releaseId",
] as const

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const assertExactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string
) => {
  const expectedSet = new Set(expected)
  for (const key of Object.keys(value)) {
    if (!expectedSet.has(key)) {
      throw new Error(`${label} has unexpected field ${key}`)
    }
  }
  for (const key of expected) {
    if (!(key in value)) {
      throw new Error(`${label} is missing field ${key}`)
    }
  }
}

const assertString = (value: unknown, label: string): string => {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`)
  }
  return value
}

const assertBoolean = (value: unknown, label: string): boolean => {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`)
  }
  return value
}

const assertCount = (value: unknown, label: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${label} must be a non-negative safe integer`)
  }
  return value as number
}

const assertStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be a string array`)
  }
  if (
    hasDuplicates(value) ||
    value.some((item) => !validIdentifier(item)) ||
    value.join("\u0000") !== sortedUnique(value).join("\u0000")
  ) {
    throw new Error(`${label} must be sorted, unique, non-empty identifiers`)
  }
  return value
}

const assertUnavailableVariants = (value: unknown, label: string) => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  const unavailable = value.map((item, index) => {
    const parsed = asRecord(item, `${label}[${index}]`)
    assertExactKeys(parsed, ["reason", "variantId"], `${label}[${index}]`)
    const reason = assertString(parsed.reason, `${label}[${index}].reason`)
    const variantId = assertString(
      parsed.variantId,
      `${label}[${index}].variantId`
    )
    if (!(validIdentifier(reason) && validIdentifier(variantId))) {
      throw new Error(`${label} must contain non-empty identifiers`)
    }
    return { reason, variantId }
  })
  const variantIds = unavailable.map(({ variantId }) => variantId)
  if (
    hasDuplicates(variantIds) ||
    variantIds.join("\u0000") !== sortedUnique(variantIds).join("\u0000")
  ) {
    throw new Error(`${label} must be sorted and unique by variantId`)
  }
  return unavailable
}

const assertSha256 = (value: unknown, label: string): string => {
  const parsed = assertString(value, label)
  if (!SHA_256.test(parsed)) {
    throw new Error(`${label} must be a lowercase SHA-256`)
  }
  return parsed
}

const validateReleaseIdentity = (value: unknown, label: string) => {
  const identity = asRecord(value, label)
  assertExactKeys(identity, RELEASE_IDENTITY_KEYS, label)
  for (const key of [
    "backendBuildHash",
    "backendDeploymentId",
    "backendReleaseSha",
    "environmentId",
    "releaseId",
  ] as const) {
    if (!validIdentifier(assertString(identity[key], `${label}.${key}`))) {
      throw new Error(`${label}.${key} must be a non-empty identifier`)
    }
  }
  if (identity.backendSlot !== "blue" && identity.backendSlot !== "green") {
    throw new Error(`${label}.backendSlot must be blue or green`)
  }
  assertSha256(
    identity.databaseInstanceFingerprint,
    `${label}.databaseInstanceFingerprint`
  )
  return identity
}

const hasValidReleaseIdentity = (value: unknown) => {
  try {
    validateReleaseIdentity(value, "releaseIdentity")
    return true
  } catch {
    return false
  }
}

const validateSharedProof = (
  value: unknown,
  label: string,
  countKeys: readonly string[] = []
) => {
  const object = asRecord(value, label)
  assertExactKeys(
    object,
    ["observedSha256", "preserved", "reviewedSha256", ...countKeys],
    label
  )
  const observed = assertSha256(
    object.observedSha256,
    `${label}.observedSha256`
  )
  const reviewed = assertSha256(
    object.reviewedSha256,
    `${label}.reviewedSha256`
  )
  const preserved = assertBoolean(object.preserved, `${label}.preserved`)
  if (preserved !== (observed === reviewed)) {
    throw new Error(`${label}.preserved contradicts its hashes`)
  }
  for (const countKey of countKeys) {
    assertCount(object[countKey], `${label}.${countKey}`)
  }
  return object
}

const validateCheckoutCanary = (
  value: unknown,
  contract: (typeof COMMERCE_MARKET_CONTRACTS)[keyof typeof COMMERCE_MARKET_CONTRACTS],
  marketProof: Record<string, unknown>
) => {
  const canary = asRecord(value, "checkoutCanary")
  assertExactKeys(canary, CHECKOUT_CANARY_KEYS, "checkoutCanary")
  if (
    canary.artifactKind !== "checkout-readiness-canary" ||
    canary.schemaVersion !== 2 ||
    canary.mutationPolicy !== "no-order-no-payment-mutation"
  ) {
    throw new Error("checkoutCanary contract is invalid")
  }
  if (
    canary.orderId !== null ||
    canary.paymentCollectionId !== null ||
    canary.paymentSessionId !== null
  ) {
    throw new Error("checkoutCanary must not contain live mutation identifiers")
  }
  const checkedAt = assertString(canary.checkedAt, "checkoutCanary.checkedAt")
  if (!validTimestamp(checkedAt)) {
    throw new Error("checkoutCanary.checkedAt must be an ISO timestamp")
  }
  validateReleaseIdentity(
    canary.releaseIdentity,
    "checkoutCanary.releaseIdentity"
  )
  if (
    canary.countryCode !== contract.countryCode ||
    canary.currencyCode !== contract.currencyCode ||
    canary.regionId !== marketProof.regionId ||
    canary.salesChannelId !== marketProof.salesChannelId
  ) {
    throw new Error("checkoutCanary market binding is invalid")
  }
  if (
    !validIdentifier(assertString(canary.variantId, "checkoutCanary.variantId"))
  ) {
    throw new Error("checkoutCanary.variantId must be a non-empty identifier")
  }
  assertBoolean(canary.shippingAvailable, "checkoutCanary.shippingAvailable")
  assertBoolean(canary.taxAvailable, "checkoutCanary.taxAvailable")
  assertBoolean(
    canary.enabledPaymentAvailable,
    "checkoutCanary.enabledPaymentAvailable"
  )
  return canary
}

const validateMarketProofIdentifiers = (proof: Record<string, unknown>) => {
  for (const key of ["regionId", "salesChannelId", "taxRegionId"] as const) {
    if (!validIdentifier(assertString(proof[key], key))) {
      throw new Error(`${key} must be a non-empty identifier`)
    }
  }
}

const validateMarketProof = (value: unknown): MarketCommerceReadinessProof => {
  const proof = asRecord(value, "market commerce readiness proof")
  assertExactKeys(proof, MARKET_PROOF_KEYS, "market commerce readiness proof")
  if (proof.kind !== "market-commerce-readiness" || proof.schemaVersion !== 2) {
    throw new Error("market commerce readiness proof contract is invalid")
  }
  const market = assertString(proof.market, "market")
  if (!COMMERCE_READINESS_MARKETS.includes(market as never)) {
    throw new Error("market is unsupported")
  }
  const contract =
    COMMERCE_MARKET_CONTRACTS[market as keyof typeof COMMERCE_MARKET_CONTRACTS]
  if (
    proof.locale !== contract.locale ||
    proof.countryCode !== contract.countryCode ||
    proof.currencyCode !== contract.currencyCode
  ) {
    throw new Error("market commerce contract tuple is invalid")
  }
  const capturedAt = assertString(proof.capturedAt, "capturedAt")
  if (!validTimestamp(capturedAt)) {
    throw new Error("capturedAt must be an ISO timestamp")
  }
  validateMarketProofIdentifiers(proof)
  const approvedVariantPriceCount = assertCount(
    proof.approvedVariantPriceCount,
    "approvedVariantPriceCount"
  )
  const publishedVariantCount = assertCount(
    proof.publishedVariantCount,
    "publishedVariantCount"
  )
  const sellableVariantCount = assertCount(
    proof.sellableVariantCount,
    "sellableVariantCount"
  )
  const unavailableVariantCount = assertCount(
    proof.unavailableVariantCount,
    "unavailableVariantCount"
  )
  const publishedVariantIds = assertStringArray(
    proof.publishedVariantIds,
    "publishedVariantIds"
  )
  const sellableVariantIds = assertStringArray(
    proof.sellableVariantIds,
    "sellableVariantIds"
  )
  const unavailableVariants = assertUnavailableVariants(
    proof.unavailableVariants,
    "unavailableVariants"
  )
  const unavailableVariantIds = unavailableVariants.map(
    ({ variantId }) => variantId
  )
  const issues = assertStringArray(proof.issues, "issues")
  const paymentProviderIds = assertStringArray(
    proof.paymentProviderIds,
    "paymentProviderIds"
  )
  const shippingOptionIds = assertStringArray(
    proof.shippingOptionIds,
    "shippingOptionIds"
  )
  const taxRateIds = assertStringArray(proof.taxRateIds, "taxRateIds")
  const sharedCatalog = validateSharedProof(
    proof.sharedCatalog,
    "sharedCatalog"
  )
  const sharedInventory = validateSharedProof(
    proof.sharedInventory,
    "sharedInventory"
  )
  const canary = validateCheckoutCanary(proof.checkoutCanary, contract, proof)
  const ready = assertBoolean(proof.ready, "ready")
  if (ready !== (issues.length === 0)) {
    throw new Error("market proof ready contradicts issues")
  }
  if (
    approvedVariantPriceCount !== sellableVariantCount ||
    publishedVariantCount !== publishedVariantIds.length ||
    sellableVariantCount !== sellableVariantIds.length ||
    unavailableVariantCount !== unavailableVariants.length ||
    publishedVariantCount !== sellableVariantCount + unavailableVariantCount ||
    sellableVariantIds.some((variantId) =>
      unavailableVariantIds.includes(variantId)
    ) ||
    sortedUnique([...sellableVariantIds, ...unavailableVariantIds]).join(
      "\u0000"
    ) !== publishedVariantIds.join("\u0000")
  ) {
    throw new Error("market proof variant partition contradicts its evidence")
  }
  if (ready) {
    assertSha256(
      proof.approvedPriceAuthoritySha256,
      "approvedPriceAuthoritySha256"
    )
    if (
      publishedVariantCount === 0 ||
      sellableVariantCount === 0 ||
      paymentProviderIds.length === 0 ||
      shippingOptionIds.length === 0 ||
      taxRateIds.length === 0 ||
      sharedCatalog.preserved !== true ||
      sharedInventory.preserved !== true ||
      canary.shippingAvailable !== true ||
      canary.taxAvailable !== true ||
      canary.enabledPaymentAvailable !== true ||
      !sellableVariantIds.includes(String(canary.variantId)) ||
      !isCheckoutCanaryFresh(
        assertString(canary.checkedAt, "checkedAt"),
        capturedAt
      )
    ) {
      throw new Error("ready market proof lacks required commerce evidence")
    }
  } else if (
    proof.approvedPriceAuthoritySha256 !== null &&
    !SHA_256.test(String(proof.approvedPriceAuthoritySha256))
  ) {
    throw new Error("approvedPriceAuthoritySha256 is invalid")
  }
  return proof as unknown as MarketCommerceReadinessProof
}

export const computeSharedCatalogSha256 = (input: SharedCatalogInput) =>
  sha256(
    canonicalJson({
      productIds: sortedUnique(input.productIds),
      variants: [...input.variants]
        .map(({ ean, id, productId, sku }) => ({ ean, id, productId, sku }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    })
  )

export const computeSharedInventorySha256 = (input: SharedInventoryInput) =>
  sha256(
    canonicalJson({
      levels: [...input.levels]
        .map((level) => ({ ...level }))
        .sort((left, right) =>
          [left.inventoryItemId, left.locationId]
            .join("\u0000")
            .localeCompare(
              [right.inventoryItemId, right.locationId].join("\u0000")
            )
        ),
      links: [...input.links]
        .map((link) => ({ ...link }))
        .sort((left, right) =>
          [left.variantId, left.inventoryItemId]
            .join("\u0000")
            .localeCompare(
              [right.variantId, right.inventoryItemId].join("\u0000")
            )
        ),
    })
  )

const sharedProof = (
  reviewedSha256: string,
  observedSha256: string
): SharedCommerceReadinessProof => ({
  observedSha256,
  preserved: SHA_256.test(reviewedSha256) && reviewedSha256 === observedSha256,
  reviewedSha256,
})

const addIssue = (issues: string[], condition: boolean, issue: string) => {
  if (!condition) {
    issues.push(issue)
  }
}

const collectPriceEvidence = (
  input: MarketCommerceReadinessInput,
  publishedVariantIds: readonly string[],
  currencyCode: string,
  issues: string[]
) => {
  const approvalAuthorities = sortedUnique(
    input.approvedVariantPrices.map(({ authoritySha256 }) => authoritySha256)
  )
  const approvedByVariant = new Map(
    input.approvedVariantPrices.map(
      (price) => [price.variantId, price] as const
    )
  )
  const observedByVariant = new Map(
    input.observedVariantPrices.map(
      (price) => [price.variantId, price] as const
    )
  )
  const unavailableByVariant = new Map(
    input.unavailableVariants.map(
      (unavailable) => [unavailable.variantId, unavailable] as const
    )
  )
  const sellableVariantIds = sortedUnique(
    input.approvedVariantPrices.map(({ variantId }) => variantId)
  )
  const unavailableVariants = [...input.unavailableVariants].sort(
    (left, right) => left.variantId.localeCompare(right.variantId)
  )
  const unavailableVariantIds = unavailableVariants.map(
    ({ variantId }) => variantId
  )
  addIssue(
    issues,
    approvedByVariant.size === input.approvedVariantPrices.length,
    "approved_price_scope_invalid"
  )
  addIssue(
    issues,
    observedByVariant.size === input.observedVariantPrices.length,
    "observed_price_scope_invalid"
  )
  addIssue(
    issues,
    unavailableByVariant.size === input.unavailableVariants.length &&
      input.unavailableVariants.every(
        ({ reason, variantId }) =>
          validIdentifier(reason) && validIdentifier(variantId)
      ),
    "unavailable_variant_scope_invalid"
  )
  addIssue(
    issues,
    approvalAuthorities.length === 1 &&
      SHA_256.test(approvalAuthorities[0] ?? ""),
    "price_authority_invalid"
  )
  addIssue(
    issues,
    input.observedVariantPrices.length === sellableVariantIds.length,
    "variant_price_scope_mismatch"
  )
  addIssue(
    issues,
    sellableVariantIds.every((variantId) =>
      publishedVariantIds.includes(variantId)
    ) &&
      unavailableVariantIds.every((variantId) =>
        publishedVariantIds.includes(variantId)
      ) &&
      sellableVariantIds.every(
        (variantId) => !unavailableByVariant.has(variantId)
      ) &&
      sortedUnique([...sellableVariantIds, ...unavailableVariantIds]).join(
        "\u0000"
      ) === publishedVariantIds.join("\u0000"),
    "variant_availability_partition_invalid"
  )
  for (const variantId of sellableVariantIds) {
    const approved = approvedByVariant.get(variantId)
    const observed = observedByVariant.get(variantId)
    addIssue(
      issues,
      Boolean(
        approved &&
          observed &&
          approved.currencyCode === currencyCode &&
          observed.currencyCode === currencyCode &&
          isPositiveCanonicalPriceAmount(approved.amount) &&
          isPositiveCanonicalPriceAmount(observed.amount) &&
          approved.amount === observed.amount
      ),
      `variant_price_not_approved:${variantId}`
    )
  }
  for (const { variantId } of unavailableVariants) {
    addIssue(
      issues,
      !(approvedByVariant.has(variantId) || observedByVariant.has(variantId)),
      `unavailable_variant_has_sellable_price:${variantId}`
    )
  }
  return { approvalAuthorities, sellableVariantIds, unavailableVariants }
}

const buildMarketProof = (
  input: MarketCommerceReadinessInput,
  context: Readonly<{
    capturedAt: string
    sharedCatalog: SharedCommerceReadinessProof
    sharedInventory: SharedCommerceReadinessProof
    sharedVariantIds: ReadonlySet<string>
  }>
): MarketCommerceReadinessProof => {
  const { capturedAt, sharedCatalog, sharedInventory, sharedVariantIds } =
    context
  const contract = COMMERCE_MARKET_CONTRACTS[input.market]
  const issues: string[] = []
  const publishedVariantIds = sortedUnique(input.publishedVariantIds)
  addIssue(issues, input.locale === contract.locale, "locale_mismatch")
  addIssue(
    issues,
    input.region.currencyCode === contract.currencyCode,
    "region_currency_mismatch"
  )
  addIssue(
    issues,
    input.region.countryCodes.length === 1 &&
      input.region.countryCodes[0] === contract.countryCode,
    "region_country_scope_mismatch"
  )
  addIssue(issues, validIdentifier(input.region.id), "region_missing")
  addIssue(
    issues,
    validIdentifier(input.salesChannelId),
    "sales_channel_missing"
  )
  addIssue(
    issues,
    input.publishedVariantIds.length > 0 &&
      !hasDuplicates(input.publishedVariantIds),
    "published_variant_scope_invalid"
  )
  addIssue(
    issues,
    publishedVariantIds.every((variantId) => sharedVariantIds.has(variantId)),
    "published_variant_not_shared"
  )

  const shippingOptions = input.shippingOptions.filter(
    (option) =>
      option.enabled &&
      option.regionId === input.region.id &&
      option.currencyCode === contract.currencyCode &&
      option.countryCodes.length === 1 &&
      option.countryCodes[0] === contract.countryCode &&
      validIdentifier(option.id)
  )
  addIssue(issues, shippingOptions.length > 0, "shipping_unavailable")

  const taxRates = input.tax.rates.filter(
    (rate) =>
      rate.enabled &&
      validIdentifier(rate.id) &&
      Number.isFinite(rate.rate) &&
      rate.rate > 0 &&
      rate.rate <= 100
  )
  addIssue(
    issues,
    validIdentifier(input.tax.id) &&
      input.tax.countryCode === contract.countryCode &&
      taxRates.length > 0,
    "tax_unavailable"
  )

  const paymentProviders = input.paymentProviders.filter(
    (provider) =>
      provider.enabled &&
      validIdentifier(provider.id) &&
      provider.regionIds.includes(input.region.id)
  )
  addIssue(issues, paymentProviders.length > 0, "enabled_payment_unavailable")

  const priceEvidence = collectPriceEvidence(
    input,
    publishedVariantIds,
    contract.currencyCode,
    issues
  )

  const canary = input.checkoutCanary
  addIssue(
    issues,
    canary.artifactKind === "checkout-readiness-canary" &&
      canary.schemaVersion === 2 &&
      canary.mutationPolicy === "no-order-no-payment-mutation" &&
      canary.orderId === null &&
      canary.paymentCollectionId === null &&
      canary.paymentSessionId === null &&
      validTimestamp(canary.checkedAt) &&
      validTimestamp(capturedAt) &&
      isCheckoutCanaryFresh(canary.checkedAt, capturedAt) &&
      hasValidReleaseIdentity(canary.releaseIdentity) &&
      canary.countryCode === contract.countryCode &&
      canary.currencyCode === contract.currencyCode &&
      canary.regionId === input.region.id &&
      canary.salesChannelId === input.salesChannelId &&
      priceEvidence.sellableVariantIds.includes(canary.variantId) &&
      canary.shippingAvailable &&
      canary.taxAvailable &&
      canary.enabledPaymentAvailable,
    "checkout_canary_invalid"
  )
  addIssue(issues, sharedCatalog.preserved, "shared_catalog_not_preserved")
  addIssue(issues, sharedInventory.preserved, "shared_inventory_not_preserved")

  const uniqueIssues = sortedUnique(issues)
  return {
    approvedPriceAuthoritySha256: priceEvidence.approvalAuthorities[0] ?? null,
    approvedVariantPriceCount: input.approvedVariantPrices.length,
    checkoutCanary: canary,
    capturedAt,
    countryCode: contract.countryCode,
    currencyCode: contract.currencyCode,
    issues: uniqueIssues,
    kind: "market-commerce-readiness",
    locale: contract.locale,
    market: input.market,
    paymentProviderIds: sortedUnique(paymentProviders.map(({ id }) => id)),
    publishedVariantCount: publishedVariantIds.length,
    publishedVariantIds,
    ready: uniqueIssues.length === 0,
    regionId: input.region.id,
    salesChannelId: input.salesChannelId,
    schemaVersion: 2,
    sellableVariantCount: priceEvidence.sellableVariantIds.length,
    sellableVariantIds: priceEvidence.sellableVariantIds,
    sharedCatalog,
    sharedInventory,
    shippingOptionIds: sortedUnique(shippingOptions.map(({ id }) => id)),
    taxRateIds: sortedUnique(taxRates.map(({ id }) => id)),
    taxRegionId: input.tax.id,
    unavailableVariantCount: priceEvidence.unavailableVariants.length,
    unavailableVariants: priceEvidence.unavailableVariants,
  }
}

export const buildMarketCommerceReadinessProof = (
  input: MarketCommerceReadinessInput,
  context: MarketCommerceReadinessContext
): MarketCommerceReadinessProof => {
  const catalogProof = sharedProof(
    context.sharedCatalog.reviewedSha256,
    computeSharedCatalogSha256(context.sharedCatalog)
  )
  const inventoryProof = sharedProof(
    context.sharedInventory.reviewedSha256,
    computeSharedInventorySha256(context.sharedInventory)
  )
  return buildMarketProof(input, {
    capturedAt: context.capturedAt,
    sharedCatalog: catalogProof,
    sharedInventory: inventoryProof,
    sharedVariantIds: new Set(
      context.sharedCatalog.variants.map(({ id }) => id)
    ),
  })
}

export const buildFourMarketCommerceReadiness = (
  input: FourMarketCommerceReadinessInput
): FourMarketCommerceReadinessProof => {
  const catalogObservedSha256 = computeSharedCatalogSha256(input.sharedCatalog)
  const inventoryObservedSha256 = computeSharedInventorySha256(
    input.sharedInventory
  )
  const catalogProof = sharedProof(
    input.sharedCatalog.reviewedSha256,
    catalogObservedSha256
  )
  const inventoryProof = sharedProof(
    input.sharedInventory.reviewedSha256,
    inventoryObservedSha256
  )
  const sharedVariantIds = new Set(
    input.sharedCatalog.variants.map(({ id }) => id)
  )
  const issues: string[] = []
  const marketsByCode = new Map(
    input.markets.map((market) => [market.market, market] as const)
  )
  if (
    input.markets.length !== COMMERCE_READINESS_MARKETS.length ||
    marketsByCode.size !== COMMERCE_READINESS_MARKETS.length
  ) {
    issues.push("market_matrix_invalid")
  }
  if (!validTimestamp(input.capturedAt)) {
    issues.push("captured_at_invalid")
  }
  if (hasDuplicates(input.sharedCatalog.productIds)) {
    issues.push("shared_product_identity_duplicated")
  }
  if (
    hasDuplicates(input.sharedCatalog.variants.map(({ id }) => id)) ||
    input.sharedCatalog.variants.some(
      (variant) => !input.sharedCatalog.productIds.includes(variant.productId)
    )
  ) {
    issues.push("shared_variant_identity_invalid")
  }
  if (
    hasDuplicates(
      input.sharedInventory.levels.map((level) =>
        [level.inventoryItemId, level.locationId].join("\u0000")
      )
    ) ||
    input.sharedInventory.levels.some(
      (level) =>
        !(
          Number.isSafeInteger(level.incomingQuantity) &&
          Number.isSafeInteger(level.stockedQuantity) &&
          Number.isSafeInteger(level.reservedQuantity)
        ) ||
        level.incomingQuantity < 0 ||
        level.stockedQuantity < 0 ||
        level.reservedQuantity < 0
    ) ||
    hasDuplicates(
      input.sharedInventory.links.map((link) =>
        [link.variantId, link.inventoryItemId].join("\u0000")
      )
    ) ||
    input.sharedInventory.links.some(
      (link) =>
        !(
          sharedVariantIds.has(link.variantId) &&
          Number.isSafeInteger(link.requiredQuantity)
        ) || link.requiredQuantity <= 0
    ) ||
    input.sharedInventory.levels.some(
      (level) =>
        !input.sharedInventory.links.some(
          (link) => link.inventoryItemId === level.inventoryItemId
        )
    )
  ) {
    issues.push("shared_inventory_scope_invalid")
  }
  if (!catalogProof.preserved) {
    issues.push("shared_catalog_not_preserved")
  }
  if (!inventoryProof.preserved) {
    issues.push("shared_inventory_not_preserved")
  }

  const markets = COMMERCE_READINESS_MARKETS.flatMap((market) => {
    const marketInput = marketsByCode.get(market)
    return marketInput
      ? [
          buildMarketProof(marketInput, {
            capturedAt: input.capturedAt,
            sharedCatalog: catalogProof,
            sharedInventory: inventoryProof,
            sharedVariantIds,
          }),
        ]
      : []
  })
  const uniqueIssues = sortedUnique([
    ...issues,
    ...markets.flatMap(({ issues: marketIssues, market }) =>
      marketIssues.map((issue) => `${market}:${issue}`)
    ),
  ])

  return {
    capturedAt: input.capturedAt,
    issues: uniqueIssues,
    kind: "four-market-commerce-readiness",
    markets,
    ready:
      uniqueIssues.length === 0 &&
      markets.length === COMMERCE_READINESS_MARKETS.length,
    schemaVersion: 2,
    sharedCatalog: {
      ...catalogProof,
      productCount: input.sharedCatalog.productIds.length,
      variantCount: input.sharedCatalog.variants.length,
    },
    sharedInventory: {
      ...inventoryProof,
      levelCount: input.sharedInventory.levels.length,
      linkCount: input.sharedInventory.links.length,
    },
  }
}

export const serializeMarketCommerceReadinessProof = (
  proof: FourMarketCommerceReadinessProof | MarketCommerceReadinessProof
) => serializeCanonicalCommerceArtifact(proof)

export const hashMarketCommerceReadinessProof = (
  proof: FourMarketCommerceReadinessProof | MarketCommerceReadinessProof
) => sha256(serializeMarketCommerceReadinessProof(proof))

const parseCanonicalJson = (text: string): unknown => {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("commerce readiness proof is not valid JSON")
  }
  return parsed
}

const assertCanonicalBytes = (text: string, value: unknown) => {
  if (`${canonicalJson(value)}\n` !== text) {
    throw new Error(
      "commerce readiness proof must be canonical JSON plus one LF"
    )
  }
}

export const parseMarketCommerceReadinessProof = (
  text: string
): MarketCommerceReadinessProof => {
  const parsed = parseCanonicalJson(text)
  const proof = validateMarketProof(parsed)
  assertCanonicalBytes(text, parsed)
  return proof
}

export const parseFourMarketCommerceReadinessProof = (
  text: string
): FourMarketCommerceReadinessProof => {
  const parsed = parseCanonicalJson(text)
  const proof = asRecord(parsed, "four-market commerce readiness proof")
  assertExactKeys(
    proof,
    [
      "capturedAt",
      "issues",
      "kind",
      "markets",
      "ready",
      "schemaVersion",
      "sharedCatalog",
      "sharedInventory",
    ],
    "four-market commerce readiness proof"
  )
  if (
    proof.kind !== "four-market-commerce-readiness" ||
    proof.schemaVersion !== 2
  ) {
    throw new Error("four-market commerce readiness proof contract is invalid")
  }
  const capturedAt = assertString(proof.capturedAt, "capturedAt")
  if (!validTimestamp(capturedAt)) {
    throw new Error("capturedAt must be an ISO timestamp")
  }
  if (!Array.isArray(proof.markets)) {
    throw new Error("markets must be an array")
  }
  const markets = proof.markets.map(validateMarketProof)
  if (
    markets.length !== COMMERCE_READINESS_MARKETS.length ||
    markets.some(
      ({ market }, index) => market !== COMMERCE_READINESS_MARKETS[index]
    )
  ) {
    throw new Error("markets must be exactly ordered sk,cz,hu,ro")
  }
  const sharedCatalog = validateSharedProof(
    proof.sharedCatalog,
    "sharedCatalog",
    ["productCount", "variantCount"]
  )
  const sharedInventory = validateSharedProof(
    proof.sharedInventory,
    "sharedInventory",
    ["levelCount", "linkCount"]
  )
  for (const market of markets) {
    const marketCatalog = asRecord(market.sharedCatalog, "market.sharedCatalog")
    const marketInventory = asRecord(
      market.sharedInventory,
      "market.sharedInventory"
    )
    if (
      marketCatalog.reviewedSha256 !== sharedCatalog.reviewedSha256 ||
      marketCatalog.observedSha256 !== sharedCatalog.observedSha256 ||
      marketCatalog.preserved !== sharedCatalog.preserved ||
      marketInventory.reviewedSha256 !== sharedInventory.reviewedSha256 ||
      marketInventory.observedSha256 !== sharedInventory.observedSha256 ||
      marketInventory.preserved !== sharedInventory.preserved
    ) {
      throw new Error("market shared-state proof differs from bundle")
    }
    if (market.capturedAt !== capturedAt) {
      throw new Error("market capturedAt differs from bundle")
    }
  }
  const issues = assertStringArray(proof.issues, "issues")
  const ready = assertBoolean(proof.ready, "ready")
  const expectedReady =
    issues.length === 0 &&
    markets.every((market) => market.ready) &&
    sharedCatalog.preserved === true &&
    sharedInventory.preserved === true
  if (ready !== expectedReady) {
    throw new Error("four-market proof ready contradicts its evidence")
  }
  assertCanonicalBytes(text, parsed)
  return proof as unknown as FourMarketCommerceReadinessProof
}

export type {
  FourMarketCommerceReadinessInput,
  FourMarketCommerceReadinessProof,
  MarketCommerceReadinessContext,
  MarketCommerceReadinessInput,
  MarketCommerceReadinessProof,
} from "./types"

import { readFile } from "node:fs/promises"
import { isAbsolute } from "node:path"
import {
  serializeCanonicalCommerceArtifact,
  sha256CommerceArtifactBytes,
} from "."
import type {
  CommerceArtifactRef,
  CommerceReleaseIdentity,
  FourMarketCommerceCollectionAuthority,
  FourMarketReviewedArtifacts,
  MarketApprovedPricesArtifact,
  MarketCommerceCollectionAuthority,
  SharedCommerceBaselineArtifact,
} from "./collector-types"
import {
  type CheckoutCanaryArtifact,
  COMMERCE_MARKET_CONTRACTS,
  COMMERCE_READINESS_MARKETS,
  type CommerceReadinessMarket,
} from "./types"

const SHA_256 = /^[a-f0-9]{64}$/
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/

type UnknownRecord = Record<string, unknown>

const record = (value: unknown, label: string): UnknownRecord => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as UnknownRecord
}

const exactKeys = (
  value: UnknownRecord,
  keys: readonly string[],
  label: string
) => {
  const expected = new Set(keys)
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) {
      throw new Error(`${label} has unexpected field ${key}`)
    }
  }
  for (const key of keys) {
    if (!(key in value)) {
      throw new Error(`${label} is missing field ${key}`)
    }
  }
}

const text = (value: unknown, label: string) => {
  if (typeof value !== "string" || value.trim() !== value || value === "") {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

const identifier = (value: unknown, label: string) => {
  const parsed = text(value, label)
  if (!IDENTIFIER.test(parsed)) {
    throw new Error(`${label} must be a canonical identifier`)
  }
  return parsed
}

const sha256 = (value: unknown, label: string) => {
  const parsed = text(value, label)
  if (!SHA_256.test(parsed)) {
    throw new Error(`${label} must be a lowercase SHA-256`)
  }
  return parsed
}

const stringList = (value: unknown, label: string) => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  const parsed = value.map((item, index) =>
    identifier(item, `${label}[${index}]`)
  )
  const sorted = [...new Set(parsed)].sort()
  if (
    sorted.length !== parsed.length ||
    sorted.join("\0") !== parsed.join("\0")
  ) {
    throw new Error(`${label} must be sorted and unique`)
  }
  return parsed
}

const nonEmptyStringList = (value: unknown, label: string) => {
  const parsed = stringList(value, label)
  if (parsed.length === 0) {
    throw new Error(`${label} must not be empty`)
  }
  return parsed
}

const artifactRef = (value: unknown, label: string): CommerceArtifactRef => {
  const parsed = record(value, label)
  exactKeys(parsed, ["path", "sha256"], label)
  const path = text(parsed.path, `${label}.path`)
  if (!isAbsolute(path)) {
    throw new Error(`${label}.path must be absolute`)
  }
  return { path, sha256: sha256(parsed.sha256, `${label}.sha256`) }
}

const releaseIdentity = (value: unknown): CommerceReleaseIdentity => {
  const parsed = record(value, "releaseIdentity")
  exactKeys(
    parsed,
    [
      "backendBuildHash",
      "backendDeploymentId",
      "backendReleaseSha",
      "backendSlot",
      "databaseInstanceFingerprint",
      "environmentId",
      "releaseId",
    ],
    "releaseIdentity"
  )
  if (parsed.backendSlot !== "blue" && parsed.backendSlot !== "green") {
    throw new Error("releaseIdentity.backendSlot must be blue or green")
  }
  return {
    backendBuildHash: identifier(
      parsed.backendBuildHash,
      "releaseIdentity.backendBuildHash"
    ),
    backendDeploymentId: identifier(
      parsed.backendDeploymentId,
      "releaseIdentity.backendDeploymentId"
    ),
    backendReleaseSha: identifier(
      parsed.backendReleaseSha,
      "releaseIdentity.backendReleaseSha"
    ),
    backendSlot: parsed.backendSlot,
    databaseInstanceFingerprint: sha256(
      parsed.databaseInstanceFingerprint,
      "releaseIdentity.databaseInstanceFingerprint"
    ),
    environmentId: identifier(
      parsed.environmentId,
      "releaseIdentity.environmentId"
    ),
    releaseId: identifier(parsed.releaseId, "releaseIdentity.releaseId"),
  }
}

const parseMarketAuthority = (
  value: unknown,
  expectedMarket: CommerceReadinessMarket
): MarketCommerceCollectionAuthority => {
  const label = `markets.${expectedMarket}`
  const parsed = record(value, label)
  exactKeys(
    parsed,
    [
      "checkoutCanary",
      "market",
      "paymentProviderIds",
      "priceAuthority",
      "regionId",
      "salesChannelId",
      "shippingOptionIds",
      "taxRateIds",
      "taxRegionId",
    ],
    label
  )
  if (parsed.market !== expectedMarket) {
    throw new Error(`${label}.market is invalid`)
  }
  return {
    checkoutCanary: artifactRef(
      parsed.checkoutCanary,
      `${label}.checkoutCanary`
    ),
    market: expectedMarket,
    paymentProviderIds: nonEmptyStringList(
      parsed.paymentProviderIds,
      `${label}.paymentProviderIds`
    ),
    priceAuthority: artifactRef(
      parsed.priceAuthority,
      `${label}.priceAuthority`
    ),
    regionId: identifier(parsed.regionId, `${label}.regionId`),
    salesChannelId: identifier(
      parsed.salesChannelId,
      `${label}.salesChannelId`
    ),
    shippingOptionIds: nonEmptyStringList(
      parsed.shippingOptionIds,
      `${label}.shippingOptionIds`
    ),
    taxRateIds: nonEmptyStringList(parsed.taxRateIds, `${label}.taxRateIds`),
    taxRegionId: identifier(parsed.taxRegionId, `${label}.taxRegionId`),
  }
}

const parseCanonical = (bytes: string, label: string) => {
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes)
  } catch {
    throw new Error(`${label} is not valid JSON`)
  }
  if (serializeCanonicalCommerceArtifact(parsed) !== bytes) {
    throw new Error(`${label} must be canonical JSON plus one LF`)
  }
  return parsed
}

export const parseFourMarketCommerceCollectionAuthority = (
  bytes: string
): FourMarketCommerceCollectionAuthority => {
  const parsed = record(
    parseCanonical(bytes, "commerce collection authority"),
    "commerce collection authority"
  )
  exactKeys(
    parsed,
    ["kind", "markets", "releaseIdentity", "schemaVersion", "sharedBaseline"],
    "commerce collection authority"
  )
  const markets = parsed.markets
  if (
    parsed.kind !== "four-market-commerce-collection-authority" ||
    parsed.schemaVersion !== 1 ||
    !Array.isArray(markets) ||
    markets.length !== COMMERCE_READINESS_MARKETS.length
  ) {
    throw new Error("commerce collection authority contract is invalid")
  }
  return {
    kind: "four-market-commerce-collection-authority",
    markets: COMMERCE_READINESS_MARKETS.map((market, index) =>
      parseMarketAuthority(markets[index], market)
    ),
    releaseIdentity: releaseIdentity(parsed.releaseIdentity),
    schemaVersion: 1,
    sharedBaseline: artifactRef(parsed.sharedBaseline, "sharedBaseline"),
  }
}

export const parseMarketApprovedPricesArtifact = (
  bytes: string,
  market: CommerceReadinessMarket
): MarketApprovedPricesArtifact => {
  const label = `${market} price authority`
  const parsed = record(parseCanonical(bytes, label), label)
  exactKeys(
    parsed,
    ["currencyCode", "kind", "market", "prices", "schemaVersion"],
    label
  )
  const contract = COMMERCE_MARKET_CONTRACTS[market]
  if (
    parsed.kind !== "market-approved-variant-prices" ||
    parsed.schemaVersion !== 1 ||
    parsed.market !== market ||
    parsed.currencyCode !== contract.currencyCode ||
    !Array.isArray(parsed.prices)
  ) {
    throw new Error(`${label} contract is invalid`)
  }
  const prices = parsed.prices.map((value, index) => {
    const price = record(value, `${label}.prices[${index}]`)
    exactKeys(price, ["amount", "variantId"], `${label}.prices[${index}]`)
    if (!Number.isSafeInteger(price.amount) || (price.amount as number) <= 0) {
      throw new Error(`${label}.prices[${index}].amount is invalid`)
    }
    return {
      amount: price.amount as number,
      variantId: identifier(
        price.variantId,
        `${label}.prices[${index}].variantId`
      ),
    }
  })
  if (
    prices.length === 0 ||
    [...prices]
      .sort((a, b) => a.variantId.localeCompare(b.variantId))
      .map(({ variantId }) => variantId)
      .join("\0") !== prices.map(({ variantId }) => variantId).join("\0") ||
    new Set(prices.map(({ variantId }) => variantId)).size !== prices.length
  ) {
    throw new Error(`${label}.prices must be non-empty, sorted and unique`)
  }
  return {
    currencyCode: contract.currencyCode,
    kind: "market-approved-variant-prices",
    market,
    prices,
    schemaVersion: 1,
  }
}

export const parseSharedCommerceBaselineArtifact = (
  bytes: string
): SharedCommerceBaselineArtifact => {
  const label = "shared commerce baseline"
  const parsed = record(parseCanonical(bytes, label), label)
  exactKeys(
    parsed,
    ["kind", "schemaVersion", "sharedCatalogSha256", "sharedInventorySha256"],
    label
  )
  if (
    parsed.kind !== "shared-commerce-state-baseline" ||
    parsed.schemaVersion !== 1
  ) {
    throw new Error(`${label} contract is invalid`)
  }
  return {
    kind: "shared-commerce-state-baseline",
    schemaVersion: 1,
    sharedCatalogSha256: sha256(
      parsed.sharedCatalogSha256,
      "sharedCatalogSha256"
    ),
    sharedInventorySha256: sha256(
      parsed.sharedInventorySha256,
      "sharedInventorySha256"
    ),
  }
}

export const parseCheckoutCanaryArtifact = (
  bytes: string,
  authority: MarketCommerceCollectionAuthority
): CheckoutCanaryArtifact => {
  const label = `${authority.market} checkout canary`
  const parsed = record(parseCanonical(bytes, label), label)
  exactKeys(
    parsed,
    [
      "artifactKind",
      "checkedAt",
      "countryCode",
      "currencyCode",
      "enabledPaymentAvailable",
      "mutationPolicy",
      "orderId",
      "paymentCollectionId",
      "paymentSessionId",
      "regionId",
      "salesChannelId",
      "schemaVersion",
      "shippingAvailable",
      "taxAvailable",
      "variantId",
    ],
    label
  )
  const contract = COMMERCE_MARKET_CONTRACTS[authority.market]
  if (
    parsed.artifactKind !== "checkout-readiness-canary" ||
    parsed.schemaVersion !== 1 ||
    parsed.mutationPolicy !== "no-order-no-payment-mutation" ||
    parsed.orderId !== null ||
    parsed.paymentCollectionId !== null ||
    parsed.paymentSessionId !== null ||
    parsed.countryCode !== contract.countryCode ||
    parsed.currencyCode !== contract.currencyCode ||
    parsed.regionId !== authority.regionId ||
    parsed.salesChannelId !== authority.salesChannelId ||
    parsed.shippingAvailable !== true ||
    parsed.taxAvailable !== true ||
    parsed.enabledPaymentAvailable !== true
  ) {
    throw new Error(`${label} is not a read-only ready canary`)
  }
  const checkedAt = text(parsed.checkedAt, `${label}.checkedAt`)
  if (new Date(checkedAt).toISOString() !== checkedAt) {
    throw new Error(`${label}.checkedAt is invalid`)
  }
  return parsed as unknown as CheckoutCanaryArtifact
}

type ReadTextFile = (path: string) => Promise<string>

const readRef = async (
  ref: CommerceArtifactRef,
  label: string,
  readTextFile: ReadTextFile
) => {
  const bytes = await readTextFile(ref.path)
  if (sha256CommerceArtifactBytes(bytes) !== ref.sha256) {
    throw new Error(`${label} bytes do not match the reviewed SHA-256`)
  }
  return bytes
}

export const readFourMarketReviewedArtifacts = async (
  authority: FourMarketCommerceCollectionAuthority,
  readTextFile: ReadTextFile = (path) => readFile(path, "utf8")
): Promise<FourMarketReviewedArtifacts> => {
  const sharedBaseline = parseSharedCommerceBaselineArtifact(
    await readRef(authority.sharedBaseline, "shared baseline", readTextFile)
  )
  const canaries = {} as Record<CommerceReadinessMarket, CheckoutCanaryArtifact>
  const prices = {} as Record<
    CommerceReadinessMarket,
    MarketApprovedPricesArtifact
  >
  await Promise.all(
    authority.markets.map(async (reviewedMarket) => {
      const [canaryBytes, priceBytes] = await Promise.all([
        readRef(
          reviewedMarket.checkoutCanary,
          `${reviewedMarket.market} checkout canary`,
          readTextFile
        ),
        readRef(
          reviewedMarket.priceAuthority,
          `${reviewedMarket.market} price authority`,
          readTextFile
        ),
      ])
      canaries[reviewedMarket.market] = parseCheckoutCanaryArtifact(
        canaryBytes,
        reviewedMarket
      )
      prices[reviewedMarket.market] = parseMarketApprovedPricesArtifact(
        priceBytes,
        reviewedMarket.market
      )
    })
  )
  return { canaries, prices, sharedBaseline }
}

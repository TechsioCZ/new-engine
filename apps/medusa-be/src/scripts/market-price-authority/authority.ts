import { readFile } from "node:fs/promises"
import {
  canonicalJsonLine,
  compareMarketPriceIdentity,
  sha256Bytes,
} from "./canonical"
import {
  MARKET_PRICE_TUPLES,
  type MarketPriceAuthority,
  type MarketPriceAuthorityEntry,
  type MarketPriceAuthorityMarket,
  type MarketPriceMarketCode,
} from "./types"

type JsonRecord = Record<string, unknown>

type ReadTextFile = (path: string) => Promise<string>
type ReadBytesFile = (path: string) => Promise<string | Uint8Array>

const SHA_256 = /^[a-f0-9]{64}$/
const ISO_TIMESTAMP =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/

const AUTHORITY_KEYS = [
  "amountUnit",
  "kind",
  "markets",
  "priceDerivation",
  "schemaVersion",
] as const
const MARKET_KEYS = [
  "commercialApproval",
  "currencyCode",
  "editor",
  "marketCode",
  "prices",
  "rawSource",
  "salesChannelId",
] as const
const ENTRY_KEYS = [
  "amount",
  "availability",
  "productId",
  "sourceRecordKey",
  "variantId",
] as const
const RAW_SOURCE_KEYS = ["provenance", "sha256"] as const
const PROVENANCE_KEYS = ["locator", "retrievedAt", "sourceType"] as const
const EDITOR_KEYS = ["editedAt", "editorId", "reference"] as const
const COMMERCIAL_APPROVAL_KEYS = [
  "approvedAt",
  "approvedBy",
  "reference",
] as const

const asRecord = (value: unknown, label: string): JsonRecord => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as JsonRecord
}

const assertExactKeys = (
  value: JsonRecord,
  expected: readonly string[],
  label: string
) => {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new Error(`${label} must have exact keys ${expected.join(", ")}`)
  }
}

const nonemptyString = (value: unknown, label: string): string => {
  const containsControlCharacter =
    typeof value === "string" &&
    Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0) as number
      return codePoint <= 31 || codePoint === 127
    })
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim() ||
    containsControlCharacter
  ) {
    throw new Error(`${label} must be a trimmed non-empty string`)
  }
  return value
}

const strictIsoTimestamp = (value: unknown, label: string): string => {
  const timestamp = nonemptyString(value, label)
  if (
    !ISO_TIMESTAMP.test(timestamp) ||
    Number.isNaN(Date.parse(timestamp)) ||
    new Date(timestamp).toISOString() !== timestamp
  ) {
    throw new Error(`${label} must be a canonical ISO timestamp`)
  }
  return timestamp
}

const lowercaseSha256 = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !SHA_256.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256`)
  }
  return value
}

const validateProvenance = (value: unknown, label: string) => {
  const provenance = asRecord(value, label)
  assertExactKeys(provenance, PROVENANCE_KEYS, label)
  nonemptyString(provenance.locator, `${label}.locator`)
  strictIsoTimestamp(provenance.retrievedAt, `${label}.retrievedAt`)
  nonemptyString(provenance.sourceType, `${label}.sourceType`)
}

const validateRawSource = (value: unknown, label: string) => {
  const rawSource = asRecord(value, label)
  assertExactKeys(rawSource, RAW_SOURCE_KEYS, label)
  lowercaseSha256(rawSource.sha256, `${label}.sha256`)
  const provenance = asRecord(rawSource.provenance, `${label}.provenance`)
  validateProvenance(provenance, `${label}.provenance`)
  return provenance.retrievedAt as string
}

const validateEditor = (value: unknown, label: string) => {
  const editor = asRecord(value, label)
  assertExactKeys(editor, EDITOR_KEYS, label)
  const editedAt = strictIsoTimestamp(editor.editedAt, `${label}.editedAt`)
  nonemptyString(editor.editorId, `${label}.editorId`)
  nonemptyString(editor.reference, `${label}.reference`)
  return editedAt
}

const validateCommercialApproval = (value: unknown, label: string) => {
  const approval = asRecord(value, label)
  assertExactKeys(approval, COMMERCIAL_APPROVAL_KEYS, label)
  const approvedAt = strictIsoTimestamp(
    approval.approvedAt,
    `${label}.approvedAt`
  )
  nonemptyString(approval.approvedBy, `${label}.approvedBy`)
  nonemptyString(approval.reference, `${label}.reference`)
  return approvedAt
}

const validateSellableAmount = (
  value: unknown,
  marketCode: MarketPriceMarketCode,
  label: string
) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite major-unit amount`)
  }
  const amountAtCurrencyExponent = marketCode === "hu" ? value : value * 100
  if (!Number.isSafeInteger(amountAtCurrencyExponent)) {
    throw new Error(
      marketCode === "hu"
        ? `${label} must be a safe integer HUF major-unit amount`
        : `${label} must have at most two decimal places within the safe cent range`
    )
  }
}

const validateEntry = (
  value: unknown,
  marketCode: MarketPriceMarketCode,
  label: string
): MarketPriceAuthorityEntry => {
  const entry = asRecord(value, label)
  assertExactKeys(entry, ENTRY_KEYS, label)
  nonemptyString(entry.productId, `${label}.productId`)
  nonemptyString(entry.variantId, `${label}.variantId`)
  nonemptyString(entry.sourceRecordKey, `${label}.sourceRecordKey`)

  if (entry.availability === "sellable") {
    validateSellableAmount(entry.amount, marketCode, `${label}.amount`)
  } else if (entry.availability === "unavailable") {
    if (entry.amount !== null) {
      throw new Error(`${label}.amount must be null when unavailable`)
    }
  } else {
    throw new Error(`${label}.availability must be sellable or unavailable`)
  }
  return entry as MarketPriceAuthorityEntry
}

const validateMarket = (
  value: unknown,
  expected: (typeof MARKET_PRICE_TUPLES)[number],
  index: number
): MarketPriceAuthorityMarket => {
  const label = `markets[${index}]`
  const market = asRecord(value, label)
  assertExactKeys(market, MARKET_KEYS, label)
  if (
    market.marketCode !== expected.marketCode ||
    market.currencyCode !== expected.currencyCode
  ) {
    throw new Error(
      `${label} must be the ${expected.marketCode}/${expected.currencyCode} market tuple`
    )
  }
  nonemptyString(market.salesChannelId, `${label}.salesChannelId`)
  const retrievedAt = validateRawSource(market.rawSource, `${label}.rawSource`)
  const editedAt = validateEditor(market.editor, `${label}.editor`)
  const approvedAt = validateCommercialApproval(
    market.commercialApproval,
    `${label}.commercialApproval`
  )
  if (!(retrievedAt <= editedAt && editedAt <= approvedAt)) {
    throw new Error(
      `${label} timestamp chronology must satisfy retrievedAt <= editedAt <= approvedAt`
    )
  }
  if (!Array.isArray(market.prices) || market.prices.length === 0) {
    throw new Error(`${label}.prices must be a non-empty visible-variant array`)
  }

  const prices = market.prices.map((entry, entryIndex) =>
    validateEntry(entry, expected.marketCode, `${label}.prices[${entryIndex}]`)
  )
  for (let entryIndex = 1; entryIndex < prices.length; entryIndex += 1) {
    const previous = prices[entryIndex - 1] as MarketPriceAuthorityEntry
    const current = prices[entryIndex] as MarketPriceAuthorityEntry
    if (
      compareMarketPriceIdentity(
        { marketCode: expected.marketCode, ...previous },
        { marketCode: expected.marketCode, ...current }
      ) >= 0
    ) {
      throw new Error(
        `${label}.prices must be strictly sorted and unique by productId/variantId`
      )
    }
  }
  return market as MarketPriceAuthorityMarket
}

export const validateMarketPriceAuthority = (
  value: unknown
): MarketPriceAuthority => {
  const authority = asRecord(value, "market price authority")
  assertExactKeys(authority, AUTHORITY_KEYS, "market price authority")
  if (
    authority.schemaVersion !== 1 ||
    authority.kind !== "reviewed-market-price-authority" ||
    authority.amountUnit !== "major" ||
    authority.priceDerivation !== "direct-reviewed-source"
  ) {
    throw new Error("market price authority contract is invalid")
  }
  if (
    !Array.isArray(authority.markets) ||
    authority.markets.length !== MARKET_PRICE_TUPLES.length
  ) {
    throw new Error("market price authority must contain exactly four markets")
  }

  const markets = authority.markets.map((market, index) =>
    validateMarket(
      market,
      MARKET_PRICE_TUPLES[index] as (typeof MARKET_PRICE_TUPLES)[number],
      index
    )
  )
  const salesChannelIds = markets.map((market) => market.salesChannelId)
  if (new Set(salesChannelIds).size !== salesChannelIds.length) {
    throw new Error("each market must use a distinct salesChannelId")
  }
  return authority as MarketPriceAuthority
}

export const parseMarketPriceAuthority = (
  bytes: string
): MarketPriceAuthority => {
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes)
  } catch {
    throw new Error("market price authority must be valid JSON")
  }
  const authority = validateMarketPriceAuthority(parsed)
  if (canonicalJsonLine(authority) !== bytes) {
    throw new Error(
      "market price authority must be canonical JSON followed by one LF"
    )
  }
  return authority
}

export const loadMarketPriceAuthority = async (
  authorityPath: string,
  expectedAuthoritySha256: string,
  readTextFile: ReadTextFile = (path) => readFile(path, "utf8")
) => {
  nonemptyString(authorityPath, "authorityPath")
  const expected = lowercaseSha256(
    expectedAuthoritySha256,
    "expectedAuthoritySha256"
  )
  const bytes = await readTextFile(authorityPath)
  const authoritySha256 = sha256Bytes(bytes)
  if (authoritySha256 !== expected) {
    throw new Error(
      "authority bytes do not match the externally reviewed SHA-256"
    )
  }
  return {
    authority: parseMarketPriceAuthority(bytes),
    authoritySha256,
  } as const
}

export const verifyMarketPriceAuthorityRawSources = async (
  authority: MarketPriceAuthority,
  rawSourcePaths: Readonly<Record<MarketPriceMarketCode, string>>,
  readBytesFile: ReadBytesFile = (path) => readFile(path)
) => {
  validateMarketPriceAuthority(authority)
  const paths = asRecord(rawSourcePaths, "rawSourcePaths")
  assertExactKeys(
    paths,
    MARKET_PRICE_TUPLES.map(({ marketCode }) => marketCode),
    "rawSourcePaths"
  )

  const observed = {} as Record<MarketPriceMarketCode, string>
  await Promise.all(
    authority.markets.map(async (market) => {
      const path = nonemptyString(
        paths[market.marketCode],
        `rawSourcePaths.${market.marketCode}`
      )
      const rawBytes = await readBytesFile(path)
      const observedSha256 = sha256Bytes(rawBytes)
      if (observedSha256 !== market.rawSource.sha256) {
        throw new Error(
          `${market.marketCode} raw source bytes do not match the reviewed SHA-256`
        )
      }
      observed[market.marketCode] = observedSha256
    })
  )
  return observed as Readonly<Record<MarketPriceMarketCode, string>>
}

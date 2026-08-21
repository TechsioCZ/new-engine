import { canonicalJsonLine, sha256Bytes } from "./canonical"
import {
  hashMarketPriceDatabaseSnapshot,
  serializeMarketPriceDatabaseSnapshot,
} from "./planner"
import type {
  MarketPriceCurrencyCode,
  MarketPriceDatabasePrice,
  MarketPriceDatabaseSnapshot,
} from "./types"

const RELEASE_SHA = /^[a-f0-9]{40}$/
const SHA_256 = /^[a-f0-9]{64}$/

export const TEST_PRICE_CONVERSION_FX_AUTHORITY = {
  baseCurrencyCode: "eur",
  kind: "frozen-ecb-euro-reference-rates",
  rates: [
    {
      currencyCode: "czk",
      denominator: 1000,
      numerator: 24_153,
      roundingQuantum: "1",
    },
    {
      currencyCode: "huf",
      denominator: 10,
      numerator: 3651,
      roundingQuantum: "1",
    },
    {
      currencyCode: "ron",
      denominator: 2000,
      numerator: 10_503,
      roundingQuantum: "0.01",
    },
  ],
  referenceDate: "2026-08-20",
  retrievedAt: "2026-08-21T08:21:52.000Z",
  schemaVersion: 1,
  sourceUrl:
    "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html",
} as const

type TargetCurrencyCode = Exclude<MarketPriceCurrencyCode, "eur">

export type TestPriceConversionBinding = Readonly<{
  backendReleaseSha: string
  databaseInstanceFingerprint: string
  environmentId: "test-engine"
  inventoryFingerprintSha256: string
  marketSalesChannels: readonly [
    Readonly<{ marketCode: "cz"; salesChannelId: string }>,
    Readonly<{ marketCode: "hu"; salesChannelId: string }>,
    Readonly<{ marketCode: "ro"; salesChannelId: string }>,
    Readonly<{ marketCode: "sk"; salesChannelId: string }>,
  ]
}>

export type TestPriceConversionMutation = Readonly<{
  action: "create" | "unchanged" | "unavailable"
  currencyCode: TargetCurrencyCode
  currentAmount: null | number
  currentPriceId: null | string
  desiredAmount: null | number
  priceSetId: string
  productId: string
  sourceEurAmount: number
  sourceEurPriceId: string
  variantId: string
}>

export type TestPriceConversionPlan = Readonly<{
  binding: TestPriceConversionBinding
  databaseSnapshotSha256: string
  fxAuthority: typeof TEST_PRICE_CONVERSION_FX_AUTHORITY
  fxAuthoritySha256: string
  kind: "test-market-price-conversion-plan"
  mutations: readonly TestPriceConversionMutation[]
  schemaVersion: 1
  summary: Readonly<{
    create: number
    sourceProducts: number
    sourceVariants: number
    targetCurrencies: 3
    unchanged: number
    unavailable: number
  }>
}>

export type TestPriceConversionPlanArtifact = Readonly<{
  kind: "test-market-price-conversion-plan-artifact"
  plan: TestPriceConversionPlan
  planSha256: string
  schemaVersion: 1
}>

const compareText = (left: string, right: string) => {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

const ceilDivide = (numerator: bigint, denominator: bigint) =>
  (numerator + denominator - 1n) / denominator

const eurCents = (amount: number, label: string): bigint => {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} must be a non-negative finite EUR amount`)
  }
  const cents = amount * 100
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`${label} must be exact at the EUR 0.01 quantum`)
  }
  return BigInt(cents)
}

export const convertEurAmountUp = (
  amount: number,
  currencyCode: TargetCurrencyCode
): number => {
  const cents = eurCents(amount, "source amount")
  const rate = TEST_PRICE_CONVERSION_FX_AUTHORITY.rates.find(
    (candidate) => candidate.currencyCode === currencyCode
  )
  if (!rate) {
    throw new Error(`unsupported target currency ${currencyCode}`)
  }
  const numerator = cents * BigInt(rate.numerator)
  const denominator = BigInt(rate.denominator)
  if (currencyCode === "ron") {
    const targetCents = ceilDivide(numerator, denominator)
    const result = Number(targetCents) / 100
    if (!Number.isSafeInteger(result * 100)) {
      throw new Error("converted RON amount exceeds the safe cent range")
    }
    return result
  }
  const targetWholeUnits = ceilDivide(numerator, denominator * 100n)
  const result = Number(targetWholeUnits)
  if (!Number.isSafeInteger(result)) {
    throw new Error(`converted ${currencyCode} amount exceeds the safe range`)
  }
  return result
}

const isDefaultBasePrice = (price: MarketPriceDatabasePrice) =>
  price.priceListId === null &&
  price.minQuantity === null &&
  price.maxQuantity === null &&
  price.rules.length === 0

const exactlyOne = <Value>(values: readonly Value[], label: string): Value => {
  if (values.length !== 1) {
    throw new Error(
      `${label} must contain exactly one price, found ${values.length}`
    )
  }
  return values[0] as Value
}

const mutationIdentity = (mutation: TestPriceConversionMutation) =>
  `${mutation.productId}\u0000${mutation.variantId}\u0000${mutation.currencyCode}`

const targetAction = (
  current: MarketPriceDatabasePrice | undefined,
  sourceCents: bigint
): TestPriceConversionMutation["action"] => {
  if (current) {
    return "unchanged"
  }
  return sourceCents === 0n ? "unavailable" : "create"
}

const buildVariantMutations = (
  productId: string,
  variant: MarketPriceDatabaseSnapshot["products"][number]["variants"][number]
): TestPriceConversionMutation[] => {
  const source = exactlyOne(
    variant.prices.filter(
      (price) => price.currencyCode === "eur" && isDefaultBasePrice(price)
    ),
    `variant ${variant.id} authoritative base EUR source`
  )
  const sourceCents = eurCents(
    source.amount,
    `variant ${variant.id} authoritative base EUR source`
  )

  return (["czk", "huf", "ron"] as const).map((currencyCode) => {
    const currentPrices = variant.prices.filter(
      (price) =>
        price.currencyCode === currencyCode && isDefaultBasePrice(price)
    )
    if (currentPrices.length > 1) {
      throw new Error(
        `variant ${variant.id} has multiple base ${currencyCode} prices`
      )
    }
    const current = currentPrices[0]
    const action = targetAction(current, sourceCents)
    return {
      action,
      currencyCode,
      currentAmount: current?.amount ?? null,
      currentPriceId: current?.id ?? null,
      desiredAmount:
        action === "create"
          ? convertEurAmountUp(source.amount, currencyCode)
          : (current?.amount ?? null),
      priceSetId: variant.priceSetId,
      productId,
      sourceEurAmount: source.amount,
      sourceEurPriceId: source.id,
      variantId: variant.id,
    }
  })
}

export const serializeTestPriceConversionFxAuthority = () =>
  canonicalJsonLine(TEST_PRICE_CONVERSION_FX_AUTHORITY)

export const hashTestPriceConversionFxAuthority = () =>
  sha256Bytes(serializeTestPriceConversionFxAuthority())

export const serializeTestPriceConversionPlan = (
  plan: TestPriceConversionPlan
) => canonicalJsonLine(plan)

export const hashTestPriceConversionPlan = (plan: TestPriceConversionPlan) =>
  sha256Bytes(serializeTestPriceConversionPlan(plan))

export const buildTestPriceConversionPlanArtifact = (
  plan: TestPriceConversionPlan
): TestPriceConversionPlanArtifact => ({
  kind: "test-market-price-conversion-plan-artifact",
  plan,
  planSha256: hashTestPriceConversionPlan(plan),
  schemaVersion: 1,
})

export const serializeTestPriceConversionPlanArtifact = (
  artifact: TestPriceConversionPlanArtifact
) => canonicalJsonLine(artifact)

const validateBinding = (binding: TestPriceConversionBinding) => {
  if (binding.environmentId !== "test-engine") {
    throw new Error("price conversion is restricted to test-engine")
  }
  if (!RELEASE_SHA.test(binding.backendReleaseSha)) {
    throw new Error("backend release SHA must be a lowercase 40-character SHA")
  }
  for (const [label, value] of [
    ["database instance fingerprint", binding.databaseInstanceFingerprint],
    ["inventory fingerprint", binding.inventoryFingerprintSha256],
  ] as const) {
    if (!SHA_256.test(value)) {
      throw new Error(`${label} must be a lowercase SHA-256`)
    }
  }
  const expectedMarkets = ["cz", "hu", "ro", "sk"] as const
  const channelIds = binding.marketSalesChannels.map(
    ({ salesChannelId }, index) => {
      if (
        binding.marketSalesChannels[index]?.marketCode !==
        expectedMarkets[index]
      ) {
        throw new Error(
          "market sales channels must use canonical cz, hu, ro, sk order"
        )
      }
      if (
        salesChannelId.length === 0 ||
        salesChannelId !== salesChannelId.trim()
      ) {
        throw new Error(
          "market sales channel IDs must be non-empty canonical strings"
        )
      }
      return salesChannelId
    }
  )
  if (new Set(channelIds).size !== expectedMarkets.length) {
    throw new Error("market sales channel IDs must be distinct")
  }
}

export const buildTestPriceConversionPlan = (
  snapshot: MarketPriceDatabaseSnapshot,
  binding: TestPriceConversionBinding
): TestPriceConversionPlan => {
  validateBinding(binding)
  if (snapshot.products.length === 0) {
    throw new Error("price conversion database scope is empty")
  }
  if (
    serializeMarketPriceDatabaseSnapshot(snapshot) !==
    canonicalJsonLine(snapshot)
  ) {
    throw new Error(
      "database snapshot must use deterministic canonical ordering"
    )
  }

  const mutations: TestPriceConversionMutation[] = []
  const variantIds = new Set<string>()
  const marketChannelIds = new Set(
    binding.marketSalesChannels.map(({ salesChannelId }) => salesChannelId)
  )
  const scopedProducts = snapshot.products.filter(
    (product) =>
      product.status === "published" &&
      product.salesChannelIds.some((salesChannelId) =>
        marketChannelIds.has(salesChannelId)
      )
  )
  for (const { marketCode, salesChannelId } of binding.marketSalesChannels) {
    if (
      !scopedProducts.some((product) =>
        product.salesChannelIds.includes(salesChannelId)
      )
    ) {
      throw new Error(
        `market ${marketCode} sales channel has no published product scope`
      )
    }
  }
  for (const product of scopedProducts) {
    for (const variant of product.variants) {
      if (variantIds.has(variant.id)) {
        throw new Error(`duplicate variant ${variant.id}`)
      }
      variantIds.add(variant.id)
      mutations.push(...buildVariantMutations(product.id, variant))
    }
  }
  if (variantIds.size === 0) {
    throw new Error("price conversion variant scope is empty")
  }
  mutations.sort((left, right) =>
    compareText(mutationIdentity(left), mutationIdentity(right))
  )
  const count = (action: TestPriceConversionMutation["action"]) =>
    mutations.filter((mutation) => mutation.action === action).length
  return {
    binding,
    databaseSnapshotSha256: hashMarketPriceDatabaseSnapshot(snapshot),
    fxAuthority: TEST_PRICE_CONVERSION_FX_AUTHORITY,
    fxAuthoritySha256: hashTestPriceConversionFxAuthority(),
    kind: "test-market-price-conversion-plan",
    mutations,
    schemaVersion: 1,
    summary: {
      create: count("create"),
      sourceProducts: scopedProducts.length,
      sourceVariants: variantIds.size,
      targetCurrencies: 3,
      unchanged: count("unchanged"),
      unavailable: count("unavailable"),
    },
  }
}

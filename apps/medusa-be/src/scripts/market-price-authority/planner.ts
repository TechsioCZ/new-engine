import {
  canonicalJson,
  canonicalJsonLine,
  compareMarketPriceIdentity,
  sha256Bytes,
} from "./canonical"
import type {
  MarketPriceAuthority,
  MarketPriceAuthorityEntry,
  MarketPriceAuthorityMarket,
  MarketPriceDatabasePrice,
  MarketPriceDatabaseRule,
  MarketPriceDatabaseSnapshot,
  MarketPriceMarketCode,
  MarketPricePlan,
  MarketPricePlanMutation,
} from "./types"
import { MARKET_PRICE_TUPLES } from "./types"

const SHA256 = /^[0-9a-f]{64}$/

const compareText = (left: string, right: string) => {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

const assertCanonicalIdentifier = (value: string, label: string) => {
  if (value === "" || value !== value.trim()) {
    throw new Error(`${label} must be a non-empty canonical string`)
  }
}

const assertFiniteAmount = (value: number, label: string) => {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`)
  }
}

const assertSellableAmount = (
  value: number,
  marketCode: MarketPriceMarketCode,
  label: string
) => {
  assertFiniteAmount(value, label)
  if (value <= 0) {
    throw new Error(`${label} must be positive`)
  }
  const amountAtCurrencyExponent = marketCode === "hu" ? value : value * 100
  if (!Number.isSafeInteger(amountAtCurrencyExponent)) {
    throw new Error(
      `${label} exceeds the exact ${marketCode} currency exponent`
    )
  }
}

const normalizeRule = (
  rule: MarketPriceDatabaseRule
): MarketPriceDatabaseRule => ({
  attribute: rule.attribute,
  operator: rule.operator,
  value: rule.value,
})

const normalizePrice = (
  price: MarketPriceDatabasePrice
): MarketPriceDatabasePrice => ({
  amount: price.amount,
  currencyCode: price.currencyCode,
  id: price.id,
  maxQuantity: price.maxQuantity,
  minQuantity: price.minQuantity,
  priceListId: price.priceListId,
  rules: price.rules
    .map(normalizeRule)
    .sort((left, right) =>
      compareText(canonicalJson(left), canonicalJson(right))
    ),
})

const normalizeDatabaseSnapshot = (
  snapshot: MarketPriceDatabaseSnapshot
): MarketPriceDatabaseSnapshot => ({
  products: snapshot.products
    .map((product) => ({
      id: product.id,
      salesChannelIds: [...product.salesChannelIds].sort(compareText),
      status: product.status,
      variants: product.variants
        .map((variant) => ({
          id: variant.id,
          priceSetId: variant.priceSetId,
          prices: variant.prices
            .map(normalizePrice)
            .sort((left, right) =>
              compareText(canonicalJson(left), canonicalJson(right))
            ),
        }))
        .sort(
          (left, right) =>
            compareText(left.id, right.id) ||
            compareText(canonicalJson(left), canonicalJson(right))
        ),
    }))
    .sort(
      (left, right) =>
        compareText(left.id, right.id) ||
        compareText(canonicalJson(left), canonicalJson(right))
    ),
})

const normalizePlan = (plan: MarketPricePlan): MarketPricePlan => ({
  authoritySha256: plan.authoritySha256,
  databaseSnapshotSha256: plan.databaseSnapshotSha256,
  kind: plan.kind,
  markets: [...plan.markets].sort(
    (left, right) =>
      compareText(left.marketCode, right.marketCode) ||
      compareText(canonicalJson(left), canonicalJson(right))
  ),
  mutations: [...plan.mutations].sort(
    (left, right) =>
      compareMarketPriceIdentity(left, right) ||
      compareText(canonicalJson(left), canonicalJson(right))
  ),
  schemaVersion: plan.schemaVersion,
  summary: plan.summary,
})

export const serializeMarketPriceDatabaseSnapshot = (
  snapshot: MarketPriceDatabaseSnapshot
): string => canonicalJsonLine(normalizeDatabaseSnapshot(snapshot))

export const hashMarketPriceDatabaseSnapshot = (
  snapshot: MarketPriceDatabaseSnapshot
): string => sha256Bytes(serializeMarketPriceDatabaseSnapshot(snapshot))

export const serializeMarketPricePlan = (plan: MarketPricePlan): string =>
  canonicalJsonLine(normalizePlan(plan))

export const hashMarketPricePlan = (plan: MarketPricePlan): string =>
  sha256Bytes(serializeMarketPricePlan(plan))

type IndexedDatabaseVariant = Readonly<{
  prices: readonly MarketPriceDatabasePrice[]
  productId: string
  variantId: string
}>

type IndexedDatabaseProduct = Readonly<{
  id: string
  salesChannelIds: ReadonlySet<string>
  status: string
  variants: readonly IndexedDatabaseVariant[]
}>

const indexDatabaseSnapshot = (
  snapshot: MarketPriceDatabaseSnapshot
): readonly IndexedDatabaseProduct[] => {
  const productIds = new Set<string>()
  const variantIds = new Set<string>()
  const priceIds = new Set<string>()

  return snapshot.products.map((product) => {
    assertCanonicalIdentifier(product.id, "database product id")
    if (productIds.has(product.id)) {
      throw new Error(`duplicate database product ${product.id}`)
    }
    productIds.add(product.id)

    const salesChannelIds = new Set<string>()
    for (const salesChannelId of product.salesChannelIds) {
      assertCanonicalIdentifier(salesChannelId, "database sales channel id")
      if (salesChannelIds.has(salesChannelId)) {
        throw new Error(
          `duplicate database sales channel ${salesChannelId} on product ${product.id}`
        )
      }
      salesChannelIds.add(salesChannelId)
    }

    const variants = product.variants.map((variant) => {
      assertCanonicalIdentifier(variant.id, "database variant id")
      assertCanonicalIdentifier(variant.priceSetId, "database price set id")
      if (variantIds.has(variant.id)) {
        throw new Error(`duplicate database variant ${variant.id}`)
      }
      variantIds.add(variant.id)

      for (const price of variant.prices) {
        assertCanonicalIdentifier(price.id, "database price id")
        if (priceIds.has(price.id)) {
          throw new Error(`duplicate database price ${price.id}`)
        }
        priceIds.add(price.id)
        assertCanonicalIdentifier(
          price.currencyCode,
          "database price currency code"
        )
        assertFiniteAmount(
          price.amount,
          `database price ${price.id} amount on variant ${variant.id}`
        )
      }

      return {
        prices: variant.prices,
        productId: product.id,
        variantId: variant.id,
      }
    })

    return {
      id: product.id,
      salesChannelIds,
      status: product.status,
      variants,
    }
  })
}

const authorityIdentity = (
  entry: Pick<MarketPriceAuthorityEntry, "productId" | "variantId">
) => `${entry.productId}\u0000${entry.variantId}`

const validateAuthorityEntry = (
  marketCode: MarketPriceMarketCode,
  entry: MarketPriceAuthorityEntry
) => {
  assertCanonicalIdentifier(
    entry.productId,
    `market ${marketCode} authority product id`
  )
  assertCanonicalIdentifier(
    entry.variantId,
    `market ${marketCode} authority variant id`
  )
  assertCanonicalIdentifier(
    entry.sourceRecordKey,
    `market ${marketCode} source record key`
  )

  if (entry.availability === "sellable") {
    if (entry.amount === null) {
      throw new Error(
        `sellable authority ${marketCode}/${entry.productId}/${entry.variantId} requires an amount`
      )
    }
    assertSellableAmount(
      entry.amount,
      marketCode,
      `authority ${marketCode}/${entry.productId}/${entry.variantId} amount`
    )
    return
  }
  if (entry.availability === "unavailable") {
    if (entry.amount !== null) {
      throw new Error(
        `unavailable authority ${marketCode}/${entry.productId}/${entry.variantId} must not have an amount`
      )
    }
    return
  }
  throw new Error(
    `invalid availability on authority ${marketCode}/${entry.productId}/${entry.variantId}`
  )
}

const validateAuthorityMarket = (
  market: MarketPriceAuthorityMarket,
  expectedCurrencyCode: string
) => {
  if (market.currencyCode !== expectedCurrencyCode) {
    throw new Error(
      `market ${market.marketCode} must use ${expectedCurrencyCode}, received ${market.currencyCode}`
    )
  }
  assertCanonicalIdentifier(
    market.salesChannelId,
    `market ${market.marketCode} sales channel id`
  )
  if (market.prices.length === 0) {
    throw new Error(`market ${market.marketCode} authority scope is empty`)
  }

  const identities = new Set<string>()
  for (const entry of market.prices) {
    validateAuthorityEntry(market.marketCode, entry)
    const identity = authorityIdentity(entry)
    if (identities.has(identity)) {
      throw new Error(
        `duplicate authority identity ${market.marketCode}/${entry.productId}/${entry.variantId}`
      )
    }
    identities.add(identity)
  }
}

const resolveBasePrice = (
  market: MarketPriceAuthorityMarket,
  variant: IndexedDatabaseVariant
): MarketPriceDatabasePrice | undefined => {
  const targetCurrencyPrices = variant.prices.filter(
    (price) => price.currencyCode === market.currencyCode
  )

  for (const price of targetCurrencyPrices) {
    const scopedFields = [
      price.priceListId !== null ? "priceListId" : null,
      price.minQuantity !== null ? "minQuantity" : null,
      price.maxQuantity !== null ? "maxQuantity" : null,
      price.rules.length > 0 ? "rules" : null,
    ].filter((field): field is string => field !== null)
    if (scopedFields.length > 0) {
      throw new Error(
        `scoped ${market.currencyCode} price ${price.id} is ambiguous for ${market.marketCode}/${variant.productId}/${variant.variantId}: ${scopedFields.join(", ")}`
      )
    }
  }
  if (targetCurrencyPrices.length > 1) {
    throw new Error(
      `multiple base ${market.currencyCode} prices are ambiguous for ${market.marketCode}/${variant.productId}/${variant.variantId}`
    )
  }

  return targetCurrencyPrices[0]
}

const planMutation = (
  market: MarketPriceAuthorityMarket,
  entry: MarketPriceAuthorityEntry,
  variant: IndexedDatabaseVariant
): MarketPricePlanMutation => {
  const current = resolveBasePrice(market, variant)

  if (entry.availability === "unavailable") {
    return {
      action: current ? "remove" : "unchanged",
      currentAmount: current?.amount ?? null,
      currentPriceId: current?.id ?? null,
      currencyCode: market.currencyCode,
      desiredAmount: null,
      marketCode: market.marketCode,
      productId: entry.productId,
      sourceRecordKey: entry.sourceRecordKey,
      variantId: entry.variantId,
    }
  }

  let action: MarketPricePlanMutation["action"] = "create"
  if (current) {
    action = current.amount === entry.amount ? "unchanged" : "update"
  }

  return {
    action,
    currentAmount: current?.amount ?? null,
    currentPriceId: current?.id ?? null,
    currencyCode: market.currencyCode,
    desiredAmount: entry.amount,
    marketCode: market.marketCode,
    productId: entry.productId,
    sourceRecordKey: entry.sourceRecordKey,
    variantId: entry.variantId,
  }
}

export const buildMarketPricePlan = (
  authority: MarketPriceAuthority,
  authoritySha256: string,
  databaseSnapshot: MarketPriceDatabaseSnapshot
): MarketPricePlan => {
  if (!SHA256.test(authoritySha256)) {
    throw new Error(
      "authority SHA-256 must be 64 lowercase hexadecimal characters"
    )
  }

  const databaseProducts = indexDatabaseSnapshot(databaseSnapshot)
  const authorityMarkets = new Map<
    MarketPriceMarketCode,
    MarketPriceAuthorityMarket
  >()
  for (const market of authority.markets) {
    if (authorityMarkets.has(market.marketCode)) {
      throw new Error(`duplicate authority market ${market.marketCode}`)
    }
    authorityMarkets.set(market.marketCode, market)
  }

  if (authority.markets.length !== MARKET_PRICE_TUPLES.length) {
    throw new Error(
      `authority must contain exactly ${MARKET_PRICE_TUPLES.length} markets`
    )
  }

  const markets: MarketPricePlan["markets"][number][] = []
  const mutations: MarketPricePlanMutation[] = []

  for (const tuple of MARKET_PRICE_TUPLES) {
    const market = authorityMarkets.get(tuple.marketCode)
    if (!market) {
      throw new Error(`authority is missing market ${tuple.marketCode}`)
    }
    validateAuthorityMarket(market, tuple.currencyCode)

    const visibleProducts = databaseProducts.filter(
      (product) =>
        product.status === "published" &&
        product.salesChannelIds.has(market.salesChannelId)
    )
    const variantlessProduct = visibleProducts.find(
      (product) => product.variants.length === 0
    )
    if (variantlessProduct) {
      throw new Error(
        `market ${market.marketCode} visible product ${variantlessProduct.id} has no variants`
      )
    }
    const visibleVariants = visibleProducts.flatMap(
      (product) => product.variants
    )
    if (visibleVariants.length === 0) {
      throw new Error(`market ${market.marketCode} database scope is empty`)
    }

    const visibleByIdentity = new Map(
      visibleVariants.map(
        (variant) => [authorityIdentity(variant), variant] as const
      )
    )
    const authorityByIdentity = new Map(
      market.prices.map((entry) => [authorityIdentity(entry), entry] as const)
    )

    const missingAuthority = [...visibleByIdentity.keys()].filter(
      (identity) => !authorityByIdentity.has(identity)
    )
    const unexpectedAuthority = [...authorityByIdentity.keys()].filter(
      (identity) => !visibleByIdentity.has(identity)
    )
    if (missingAuthority.length > 0 || unexpectedAuthority.length > 0) {
      throw new Error(
        `market ${market.marketCode} authority identities do not exactly match published sales-channel variants (missing=${missingAuthority.length}, unexpected=${unexpectedAuthority.length})`
      )
    }

    const marketMutations = [...authorityByIdentity.entries()]
      .sort(([left], [right]) => compareText(left, right))
      .map(([identity, entry]) => {
        const variant = visibleByIdentity.get(identity)
        if (!variant) {
          throw new Error(
            `market ${market.marketCode} authority contains unexpected identity ${entry.productId}/${entry.variantId}`
          )
        }
        return planMutation(market, entry, variant)
      })
    mutations.push(...marketMutations)

    const count = (action: MarketPricePlanMutation["action"]) =>
      marketMutations.filter((mutation) => mutation.action === action).length
    markets.push({
      create: count("create"),
      currencyCode: market.currencyCode,
      marketCode: market.marketCode,
      remove: count("remove"),
      salesChannelId: market.salesChannelId,
      unchanged: count("unchanged"),
      update: count("update"),
      visibleProducts: visibleProducts.length,
      visibleVariants: visibleVariants.length,
    })
  }

  const sortedMutations = mutations.sort(compareMarketPriceIdentity)
  const total = (action: MarketPricePlanMutation["action"]) =>
    sortedMutations.filter((mutation) => mutation.action === action).length

  return {
    authoritySha256,
    databaseSnapshotSha256: hashMarketPriceDatabaseSnapshot(databaseSnapshot),
    kind: "market-price-authority-dry-run-plan",
    markets: markets.sort((left, right) =>
      compareText(left.marketCode, right.marketCode)
    ),
    mutations: sortedMutations,
    schemaVersion: 1,
    summary: {
      create: total("create"),
      markets: 4,
      remove: total("remove"),
      unchanged: total("unchanged"),
      update: total("update"),
      visibleProducts: markets.reduce(
        (sum, market) => sum + market.visibleProducts,
        0
      ),
      visibleVariants: markets.reduce(
        (sum, market) => sum + market.visibleVariants,
        0
      ),
    },
  }
}

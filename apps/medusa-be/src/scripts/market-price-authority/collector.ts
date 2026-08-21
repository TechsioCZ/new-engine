import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { canonicalJson } from "./canonical"
import type {
  MarketPriceDatabasePrice,
  MarketPriceDatabaseRule,
  MarketPriceDatabaseSnapshot,
} from "./types"

type QueryService = Readonly<{
  graph: <T>(
    input: Readonly<{
      entity: string
      fields: readonly string[]
      filters?: Readonly<Record<string, unknown>>
      pagination?: Readonly<{ skip?: number; take: number }>
    }>
  ) => Promise<Readonly<{ data?: T[] }>>
}>

type JsonPrimitive = boolean | null | number | string
type JsonObject = {
  readonly [key: string]: JsonValue
}
type JsonValue = JsonPrimitive | readonly JsonValue[] | JsonObject

type NormalizedProduct = {
  id: string
  salesChannelIds: string[]
  status: string
}

type NormalizedVariant = { id: string; productId: string }

type PriceSetLinks = Readonly<{
  priceSetByVariantId: ReadonlyMap<string, string>
  variantByPriceSetId: ReadonlyMap<string, string>
}>

const PAGE_SIZE = 500
const FILTER_BATCH_SIZE = 250

const PRODUCT_FIELDS = ["id", "status", "sales_channels.id"] as const
const VARIANT_FIELDS = ["id", "product_id"] as const
const VARIANT_PRICE_SET_FIELDS = ["variant_id", "price_set_id"] as const
const PRICE_FIELDS = [
  "id",
  "amount",
  "currency_code",
  "price_set_id",
  "price_list_id",
  "min_quantity",
  "max_quantity",
  "price_rules.attribute",
  "price_rules.operator",
  "price_rules.value",
] as const

const compareText = (left: string, right: string) => {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

const recordValue = (value: unknown, label: string) => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const arrayValue = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  return value
}

const trimmedText = (value: unknown, label: string) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim()
  ) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

const finiteNumber = (value: unknown, label: string): number => {
  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      return value
    }
    throw new Error(`${label} must be finite`)
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const bigNumberValue = (value as Record<string, unknown>).value
    if (
      (typeof bigNumberValue === "string" &&
        bigNumberValue.trim().length > 0) ||
      typeof bigNumberValue === "number"
    ) {
      const normalized = Number(bigNumberValue)
      if (Number.isFinite(normalized)) {
        return normalized
      }
    }
  }

  throw new Error(`${label} must be a finite number`)
}

const nullableFiniteNumber = (value: unknown, label: string) =>
  value === null || value === undefined ? null : finiteNumber(value, label)

const normalizeJsonValue = (value: unknown, label: string): JsonValue => {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} contains a non-finite number`)
    }
    return value
  }
  if (Array.isArray(value)) {
    return value.map((child, index) =>
      normalizeJsonValue(child, `${label}[${index}]`)
    )
  }
  if (value && typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw new Error(`${label} contains a non-JSON object`)
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, child]) => [
          key,
          normalizeJsonValue(child, `${label}.${key}`),
        ])
    )
  }
  throw new Error(`${label} contains a non-JSON value`)
}

const readPaged = async <Value>(
  query: QueryService,
  input: Readonly<{
    entity: string
    fields: readonly string[]
    filters?: Readonly<Record<string, unknown>>
  }>
) => {
  const rows: Value[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const { data = [] } = await query.graph<Value>({
      ...input,
      pagination: { skip, take: PAGE_SIZE },
    })
    rows.push(...data)
    if (data.length < PAGE_SIZE) {
      return rows
    }
  }
}

const assertUnique = (seen: Set<string>, id: string, label: string) => {
  if (seen.has(id)) {
    throw new Error(`duplicate ${label} "${id}"`)
  }
  seen.add(id)
}

const normalizeRules = (
  value: unknown,
  priceId: string
): MarketPriceDatabaseRule[] => {
  if (value === null || value === undefined) {
    return []
  }
  const rules = arrayValue(value, `price "${priceId}" price_rules`).map(
    (rawRule, index) => {
      const rule = recordValue(rawRule, `price "${priceId}" rule ${index}`)
      return {
        attribute: trimmedText(
          rule.attribute,
          `price "${priceId}" rule ${index}.attribute`
        ),
        operator: trimmedText(
          rule.operator,
          `price "${priceId}" rule ${index}.operator`
        ),
        value: normalizeJsonValue(
          rule.value,
          `price "${priceId}" rule ${index}.value`
        ),
      }
    }
  )

  return rules.sort((left, right) =>
    compareText(
      `${left.attribute}\u0000${left.operator}\u0000${canonicalJson(left.value)}`,
      `${right.attribute}\u0000${right.operator}\u0000${canonicalJson(right.value)}`
    )
  )
}

const normalizePrice = (
  value: unknown,
  expectedPriceSetIds: ReadonlySet<string>,
  seenPriceIds: Set<string>
): Readonly<{ price: MarketPriceDatabasePrice; priceSetId: string }> => {
  const rawPrice = recordValue(value, "price")
  const id = trimmedText(rawPrice.id, "price.id")
  assertUnique(seenPriceIds, id, "price id")
  const priceSetId = trimmedText(
    rawPrice.price_set_id,
    `price "${id}".price_set_id`
  )
  if (!expectedPriceSetIds.has(priceSetId)) {
    throw new Error(
      `price "${id}" references unexpected price set "${priceSetId}"`
    )
  }

  return {
    price: {
      amount: finiteNumber(rawPrice.amount, `price "${id}".amount`),
      currencyCode: trimmedText(
        rawPrice.currency_code,
        `price "${id}".currency_code`
      ).toLowerCase(),
      id,
      maxQuantity: nullableFiniteNumber(
        rawPrice.max_quantity,
        `price "${id}".max_quantity`
      ),
      minQuantity: nullableFiniteNumber(
        rawPrice.min_quantity,
        `price "${id}".min_quantity`
      ),
      priceListId:
        rawPrice.price_list_id === null || rawPrice.price_list_id === undefined
          ? null
          : trimmedText(rawPrice.price_list_id, `price "${id}".price_list_id`),
      rules: normalizeRules(rawPrice.price_rules, id),
    },
    priceSetId,
  }
}

const normalizeProducts = (rawProducts: readonly unknown[]) => {
  const productsById = new Map<string, NormalizedProduct>()
  for (const [index, value] of rawProducts.entries()) {
    const product = recordValue(value, `product ${index}`)
    const id = trimmedText(product.id, `product ${index}.id`)
    if (productsById.has(id)) {
      throw new Error(`duplicate product id "${id}"`)
    }
    const seenSalesChannelIds = new Set<string>()
    const rawSalesChannels =
      product.sales_channels === null || product.sales_channels === undefined
        ? []
        : arrayValue(product.sales_channels, `product "${id}".sales_channels`)
    const salesChannelIds = rawSalesChannels.map(
      (rawSalesChannel, salesChannelIndex) => {
        const salesChannel = recordValue(
          rawSalesChannel,
          `product "${id}" sales channel ${salesChannelIndex}`
        )
        const salesChannelId = trimmedText(
          salesChannel.id,
          `product "${id}" sales channel ${salesChannelIndex}.id`
        )
        assertUnique(
          seenSalesChannelIds,
          salesChannelId,
          `sales channel id on product "${id}"`
        )
        return salesChannelId
      }
    )
    productsById.set(id, {
      id,
      salesChannelIds: salesChannelIds.sort(compareText),
      status: trimmedText(product.status, `product "${id}".status`),
    })
  }
  return productsById
}

const normalizeVariants = (
  rawVariants: readonly unknown[],
  productsById: ReadonlyMap<string, NormalizedProduct>
) => {
  const variantsById = new Map<string, NormalizedVariant>()
  for (const [index, value] of rawVariants.entries()) {
    const variant = recordValue(value, `variant ${index}`)
    const id = trimmedText(variant.id, `variant ${index}.id`)
    if (variantsById.has(id)) {
      throw new Error(`duplicate variant id "${id}"`)
    }
    const productId = trimmedText(
      variant.product_id,
      `variant "${id}".product_id`
    )
    if (!productsById.has(productId)) {
      throw new Error(
        `variant "${id}" references unknown product "${productId}"`
      )
    }
    variantsById.set(id, { id, productId })
  }
  return variantsById
}

const normalizePriceSetLinks = (
  rawLinks: readonly unknown[],
  variantsById: ReadonlyMap<string, NormalizedVariant>
): PriceSetLinks => {
  const priceSetByVariantId = new Map<string, string>()
  const variantByPriceSetId = new Map<string, string>()
  for (const [index, value] of rawLinks.entries()) {
    const link = recordValue(value, `variant price-set link ${index}`)
    const variantId = trimmedText(
      link.variant_id,
      `variant price-set link ${index}.variant_id`
    )
    const priceSetId = trimmedText(
      link.price_set_id,
      `variant price-set link ${index}.price_set_id`
    )
    if (!variantsById.has(variantId)) {
      throw new Error(
        `price-set link references unknown variant "${variantId}"`
      )
    }
    if (priceSetByVariantId.has(variantId)) {
      throw new Error(`duplicate price-set link for variant "${variantId}"`)
    }
    if (variantByPriceSetId.has(priceSetId)) {
      throw new Error(`duplicate variant link for price set "${priceSetId}"`)
    }
    priceSetByVariantId.set(variantId, priceSetId)
    variantByPriceSetId.set(priceSetId, variantId)
  }
  for (const variantId of variantsById.keys()) {
    if (!priceSetByVariantId.has(variantId)) {
      throw new Error(`variant "${variantId}" is missing its price-set link`)
    }
  }
  return { priceSetByVariantId, variantByPriceSetId }
}

const collectPricesByPriceSetId = async (
  query: QueryService,
  priceSetIds: readonly string[]
) => {
  const rawPrices: unknown[] = []
  for (let index = 0; index < priceSetIds.length; index += FILTER_BATCH_SIZE) {
    const priceSetIdBatch = priceSetIds.slice(index, index + FILTER_BATCH_SIZE)
    rawPrices.push(
      ...(await readPaged<unknown>(query, {
        entity: "price",
        fields: PRICE_FIELDS,
        filters: { price_set_id: { $in: priceSetIdBatch } },
      }))
    )
  }

  const pricesByPriceSetId = new Map<string, MarketPriceDatabasePrice[]>()
  const seenPriceIds = new Set<string>()
  const expectedPriceSetIds = new Set(priceSetIds)
  for (const rawPrice of rawPrices) {
    const { price, priceSetId } = normalizePrice(
      rawPrice,
      expectedPriceSetIds,
      seenPriceIds
    )
    const prices = pricesByPriceSetId.get(priceSetId) ?? []
    prices.push(price)
    pricesByPriceSetId.set(priceSetId, prices)
  }
  for (const prices of pricesByPriceSetId.values()) {
    prices.sort((left, right) => compareText(left.id, right.id))
  }
  return pricesByPriceSetId
}

const assembleSnapshot = (
  productsById: ReadonlyMap<string, NormalizedProduct>,
  variantsById: ReadonlyMap<string, NormalizedVariant>,
  priceSetByVariantId: ReadonlyMap<string, string>,
  pricesByPriceSetId: ReadonlyMap<string, readonly MarketPriceDatabasePrice[]>
): MarketPriceDatabaseSnapshot => {
  const variantsByProductId = new Map<
    string,
    Array<{
      id: string
      priceSetId: string
      prices: readonly MarketPriceDatabasePrice[]
    }>
  >()
  for (const variant of variantsById.values()) {
    const priceSetId = priceSetByVariantId.get(variant.id)
    if (!priceSetId) {
      throw new Error(`variant "${variant.id}" is missing its price-set link`)
    }
    const productVariants = variantsByProductId.get(variant.productId) ?? []
    productVariants.push({
      id: variant.id,
      priceSetId,
      prices: pricesByPriceSetId.get(priceSetId) ?? [],
    })
    variantsByProductId.set(variant.productId, productVariants)
  }
  for (const variants of variantsByProductId.values()) {
    variants.sort((left, right) => compareText(left.id, right.id))
  }

  return {
    products: [...productsById.values()]
      .sort((left, right) => compareText(left.id, right.id))
      .map((product) => ({
        ...product,
        variants: variantsByProductId.get(product.id) ?? [],
      })),
  }
}

export const collectMarketPriceDatabaseSnapshot = async (
  container: MedusaContainer
): Promise<MarketPriceDatabaseSnapshot> => {
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const [rawProducts, rawVariants, rawLinks] = await Promise.all([
    readPaged<unknown>(query, {
      entity: "product",
      fields: PRODUCT_FIELDS,
    }),
    readPaged<unknown>(query, {
      entity: "product_variant",
      fields: VARIANT_FIELDS,
    }),
    readPaged<unknown>(query, {
      entity: "product_variant_price_set",
      fields: VARIANT_PRICE_SET_FIELDS,
    }),
  ])

  const productsById = normalizeProducts(rawProducts)
  const variantsById = normalizeVariants(rawVariants, productsById)
  const { priceSetByVariantId, variantByPriceSetId } = normalizePriceSetLinks(
    rawLinks,
    variantsById
  )
  const priceSetIds = [...variantByPriceSetId.keys()].sort(compareText)
  const pricesByPriceSetId = await collectPricesByPriceSetId(query, priceSetIds)

  return assembleSnapshot(
    productsById,
    variantsById,
    priceSetByVariantId,
    pricesByPriceSetId
  )
}

import { isPlainRecord } from "../guards"
import { normalizeFiniteNumber } from "./normalizers"

export const ProductSalePriceListType = {
  OVERRIDE: "override",
  SALE: "sale",
} as const

export type ProductSalePriceListType =
  (typeof ProductSalePriceListType)[keyof typeof ProductSalePriceListType]

const ACTIVE_PRICE_LIST_STATUS = "active"
const CUSTOMER_GROUP_RULE_ATTRIBUTE = "customer.groups.id"
const DEFAULT_PAGE_SIZE = 500
const DEFAULT_QUANTITY = 1

type GraphResult = {
  data?: Record<string, unknown>[]
}

type ProductSalePriceListQuery = {
  graph: (config: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
    pagination?: Record<string, unknown>
  }) => Promise<GraphResult>
}

type ProductSaleVariantMatch = {
  productId: string
  variantId: string
}

type ProductSaleReferencePriceRecord = {
  amount?: unknown
  currency_code?: unknown
  max_quantity?: unknown
  min_quantity?: unknown
  price_list_id?: unknown
  price_set_id?: unknown
}

export type ProductSaleProductSelection = {
  productIds: string[]
  variantIds: string[]
  variantMatches: ProductSaleVariantMatch[]
}

type ActiveSalePriceRecordOptions = {
  currencyCode?: string
  customerGroupIds?: string[]
  now?: Date
  quantity?: number
  referencePrices?: ProductSaleReferencePriceRecord[]
}

type ListActiveSalePriceListProductSelectionOptions =
  ActiveSalePriceRecordOptions & {
    pageSize?: number
    query: ProductSalePriceListQuery
  }

const SALE_PRICE_FIELDS = [
  "id",
  "amount",
  "currency_code",
  "min_quantity",
  "max_quantity",
  "price_set_id",
  "price_list.id",
  "price_list.type",
  "price_list.status",
  "price_list.starts_at",
  "price_list.ends_at",
  "price_list.price_list_rules.attribute",
  "price_list.price_list_rules.value",
  "price_set.variant.id",
  "price_set.variant.product_id",
  "price_set.id",
  "price_set.variant.product.id",
]

const REFERENCE_PRICE_FIELDS = [
  "id",
  "amount",
  "currency_code",
  "min_quantity",
  "max_quantity",
  "price_list_id",
  "price_set_id",
]

const normalizeCurrencyCode = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim()
    ? value.trim().toLowerCase()
    : undefined

const getString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value
  }

  if (typeof value !== "string" || !value.trim()) {
    return
  }

  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : undefined
}

const isDateWindowActive = (
  startsAt: unknown,
  endsAt: unknown,
  now: Date
): boolean => {
  const start = toDate(startsAt)
  const end = toDate(endsAt)

  if (start && now < start) {
    return false
  }

  if (end && now > end) {
    return false
  }

  return true
}

const collectStringValues = (
  value: unknown,
  result: string[] = []
): string[] => {
  if (typeof value === "string" && value.trim()) {
    result.push(value.trim())
    return result
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, result)
    }
    return result
  }

  if (isPlainRecord(value)) {
    for (const item of Object.values(value)) {
      collectStringValues(item, result)
    }
  }

  return result
}

const salePriceListRulesApply = (
  rules: unknown,
  customerGroupIds: Set<string>
): boolean => {
  const ruleRecords = Array.isArray(rules) ? rules.filter(isPlainRecord) : []

  if (ruleRecords.length === 0) {
    return true
  }

  return ruleRecords.every((rule) => {
    const attribute = getString(rule.attribute)
    const values = collectStringValues(rule.value)

    if (attribute === CUSTOMER_GROUP_RULE_ATTRIBUTE) {
      return values.some((value) => customerGroupIds.has(value))
    }

    return false
  })
}

const salePriceAppliesToQuantity = (
  record: Record<string, unknown>,
  quantity: number
): boolean => {
  const minQuantity = normalizeFiniteNumber(record.min_quantity)
  const maxQuantity = normalizeFiniteNumber(record.max_quantity)

  if (minQuantity !== undefined && quantity < minQuantity) {
    return false
  }

  if (maxQuantity !== undefined && quantity > maxQuantity) {
    return false
  }

  return true
}

export const isActiveSalePriceRecord = (
  record: unknown,
  options: ActiveSalePriceRecordOptions = {}
): boolean => {
  if (!isPlainRecord(record)) {
    return false
  }

  const priceList = isPlainRecord(record.price_list)
    ? record.price_list
    : undefined
  if (!priceList) {
    return false
  }

  if (priceList.type !== ProductSalePriceListType.SALE) {
    return false
  }

  if (priceList.status !== ACTIVE_PRICE_LIST_STATUS) {
    return false
  }

  const now = options.now ?? new Date()
  if (!isDateWindowActive(priceList.starts_at, priceList.ends_at, now)) {
    return false
  }

  const currencyCode = normalizeCurrencyCode(options.currencyCode)
  if (
    currencyCode &&
    normalizeCurrencyCode(record.currency_code) !== currencyCode
  ) {
    return false
  }

  if (
    !salePriceAppliesToQuantity(record, options.quantity ?? DEFAULT_QUANTITY)
  ) {
    return false
  }

  return salePriceListRulesApply(
    priceList.price_list_rules,
    new Set(options.customerGroupIds ?? [])
  )
}

const getPriceSetId = (record: Record<string, unknown>): string | undefined => {
  const priceSetId = getString(record.price_set_id)
  if (priceSetId) {
    return priceSetId
  }

  const priceSet = isPlainRecord(record.price_set)
    ? record.price_set
    : undefined
  return getString(priceSet?.id)
}

const getVariantMatch = (
  record: Record<string, unknown>
): ProductSaleVariantMatch | undefined => {
  const priceSet = isPlainRecord(record.price_set)
    ? record.price_set
    : undefined
  const variant = isPlainRecord(priceSet?.variant)
    ? priceSet.variant
    : undefined
  const product = isPlainRecord(variant?.product) ? variant.product : undefined
  const productId = getString(variant?.product_id) ?? getString(product?.id)
  const variantId = getString(variant?.id)

  return productId && variantId ? { productId, variantId } : undefined
}

const groupReferencePricesByPriceSetId = (
  referencePrices: ProductSaleReferencePriceRecord[] = []
): Map<string, ProductSaleReferencePriceRecord[]> => {
  const result = new Map<string, ProductSaleReferencePriceRecord[]>()

  for (const referencePrice of referencePrices) {
    if (!isPlainRecord(referencePrice)) {
      continue
    }

    const priceSetId = getPriceSetId(referencePrice)
    if (!priceSetId) {
      continue
    }

    const current = result.get(priceSetId) ?? []
    current.push(referencePrice)
    result.set(priceSetId, current)
  }

  return result
}

const isReferencePriceCandidate = (
  record: ProductSaleReferencePriceRecord,
  saleRecord: Record<string, unknown>,
  options: ActiveSalePriceRecordOptions
): boolean => {
  if (getString(record.price_list_id)) {
    return false
  }

  const currencyCode =
    normalizeCurrencyCode(options.currencyCode) ??
    normalizeCurrencyCode(saleRecord.currency_code)
  if (
    currencyCode &&
    normalizeCurrencyCode(record.currency_code) !== currencyCode
  ) {
    return false
  }

  return salePriceAppliesToQuantity(
    record as Record<string, unknown>,
    options.quantity ?? DEFAULT_QUANTITY
  )
}

const isDiscountedAgainstReferencePrice = (
  record: Record<string, unknown>,
  options: ActiveSalePriceRecordOptions,
  referencePricesByPriceSetId: Map<string, ProductSaleReferencePriceRecord[]>
): boolean => {
  const saleAmount = normalizeFiniteNumber(record.amount)
  const priceSetId = getPriceSetId(record)
  if (saleAmount === undefined || !priceSetId) {
    return false
  }

  const referenceAmounts = (referencePricesByPriceSetId.get(priceSetId) ?? [])
    .filter((referencePrice) =>
      isReferencePriceCandidate(referencePrice, record, options)
    )
    .map((referencePrice) => normalizeFiniteNumber(referencePrice.amount))
    .filter(
      (amount): amount is number =>
        typeof amount === "number" && Number.isFinite(amount)
    )

  if (referenceAmounts.length === 0) {
    return false
  }

  return saleAmount < Math.min(...referenceAmounts)
}

export const selectActiveSalePriceProducts = (
  records: unknown[],
  options: ActiveSalePriceRecordOptions = {}
): ProductSaleProductSelection => {
  const productIds = new Set<string>()
  const variantIds = new Set<string>()
  const variantMatchesByKey = new Map<string, ProductSaleVariantMatch>()
  const referencePricesByPriceSetId = groupReferencePricesByPriceSetId(
    options.referencePrices
  )

  for (const record of records) {
    if (
      !(
        isActiveSalePriceRecord(record, options) &&
        isPlainRecord(record) &&
        isDiscountedAgainstReferencePrice(
          record,
          options,
          referencePricesByPriceSetId
        )
      )
    ) {
      continue
    }

    const match = getVariantMatch(record)
    if (!match) {
      continue
    }

    productIds.add(match.productId)
    variantIds.add(match.variantId)
    variantMatchesByKey.set(`${match.productId}:${match.variantId}`, match)
  }

  return {
    productIds: Array.from(productIds),
    variantIds: Array.from(variantIds),
    variantMatches: Array.from(variantMatchesByKey.values()),
  }
}

export const listActiveSalePriceListProductSelection = async (
  options: ListActiveSalePriceListProductSelectionOptions
): Promise<ProductSaleProductSelection> => {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
  const records: Record<string, unknown>[] = []
  const currencyCode = normalizeCurrencyCode(options.currencyCode)
  const filters: Record<string, unknown> = {
    price_list: {
      status: ACTIVE_PRICE_LIST_STATUS,
      type: ProductSalePriceListType.SALE,
    },
  }
  if (currencyCode) {
    filters.currency_code = currencyCode
  }
  let skip = 0

  while (true) {
    const { data = [] } = await options.query.graph({
      entity: "price",
      fields: SALE_PRICE_FIELDS,
      filters,
      pagination: {
        skip,
        take: pageSize,
      },
    })

    records.push(...data)

    if (data.length < pageSize) {
      break
    }

    skip += data.length
  }

  const priceSetIds = Array.from(
    new Set(
      records.map(getPriceSetId).filter((id): id is string => Boolean(id))
    )
  )
  const referencePrices: ProductSaleReferencePriceRecord[] = []

  for (let index = 0; index < priceSetIds.length; index += pageSize) {
    const priceSetIdBatch = priceSetIds.slice(index, index + pageSize)
    let referenceSkip = 0

    while (priceSetIdBatch.length > 0) {
      const { data = [] } = await options.query.graph({
        entity: "price",
        fields: REFERENCE_PRICE_FIELDS,
        filters: {
          price_list_id: null,
          price_set_id: {
            $in: priceSetIdBatch,
          },
          ...(currencyCode ? { currency_code: currencyCode } : {}),
        },
        pagination: {
          skip: referenceSkip,
          take: pageSize,
        },
      })

      referencePrices.push(...(data as ProductSaleReferencePriceRecord[]))

      if (data.length < pageSize) {
        break
      }

      referenceSkip += data.length
    }
  }

  return selectActiveSalePriceProducts(records, {
    ...options,
    referencePrices,
  })
}

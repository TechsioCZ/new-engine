import { MedusaError } from "@medusajs/framework/utils"

import type {
  ExistingPrice,
  ExistingPriceList,
  ExistingPriceListIndex,
  PriceListCodeMapping,
  PriceListCustomerGroupIndex,
  VariantLookupMaps,
} from "./client"
import type {
  ListedPriceList,
  PriceInput,
  PriceListInput,
  PriceListPriceResult,
} from "./types"

const CODE_PREFIX = "[symmy_code:"
const CODE_SUFFIX = "]"
const LEADING_NEWLINE = /^\n/u

export interface PriceIdentifierSets {
  skus: Set<string>
  eans: Set<string>
  variantIds: Set<string>
}

interface DecodedDescription {
  code: string | null
  description: string | undefined
}

const encodeDescription = (code: string, description?: string | null): string =>
  `${CODE_PREFIX}${code}${CODE_SUFFIX}\n${description ?? ""}`

const decodeDescription = (description?: string | null): DecodedDescription => {
  const encoded = description ?? undefined
  if (encoded === undefined || !encoded.startsWith(CODE_PREFIX)) {
    return { code: null, description: encoded }
  }
  const end = encoded.indexOf(CODE_SUFFIX)
  if (end === -1) {
    return { code: null, description: encoded }
  }
  return {
    code: encoded.slice(CODE_PREFIX.length, end),
    description: encoded
      .slice(end + CODE_SUFFIX.length)
      .replace(LEADING_NEWLINE, ""),
  }
}

const collectPriceListCodes = (priceLists: PriceListInput[]): Set<string> =>
  new Set(priceLists.map((priceList) => priceList.code))

const getPriceListCode = (priceList: ExistingPriceList): string | null =>
  priceList.erp_code ?? decodeDescription(priceList.description).code

const buildPriceListIndex = (
  priceLists: ExistingPriceList[],
): ExistingPriceListIndex => {
  const byCode = new Map<string, ExistingPriceList>()
  for (const priceList of priceLists) {
    const code = getPriceListCode(priceList)
    if (code !== null && code.length > 0) {
      byCode.set(code, priceList)
    }
  }
  return { byCode }
}

const toListedPriceList = (
  priceList: ExistingPriceList,
): ListedPriceList | null => {
  const decoded = decodeDescription(priceList.description)
  const code = priceList.erp_code ?? decoded.code
  if (code === null || code.length === 0) {
    return null
  }
  return {
    code,
    id: priceList.id,
    name: priceList.title,
    ...(decoded.description === undefined
      ? {}
      : { description: decoded.description }),
    ends_at: priceList.ends_at,
    starts_at: priceList.starts_at,
  }
}

const collectCustomerGroupCodes = (priceLists: PriceListInput[]): Set<string> =>
  new Set(
    priceLists
      .map((priceList) => priceList.customer_group_code)
      .filter((code): code is string => Boolean(code)),
  )

const buildCustomerGroupIndex = (
  groups: {
    id: string
    name: string
    code?: string | null
    erp_code?: string | null
    metadata: Record<string, unknown> | null
  }[],
  codes: Set<string>,
): PriceListCustomerGroupIndex => {
  const byCode = new Map<string, { id: string }>()
  for (const group of groups) {
    for (const code of [group.name, group.code, group.erp_code]) {
      if (code === null || code === undefined || code.length === 0) {
        continue
      }
      if (codes.has(code)) {
        byCode.set(code, group)
      }
    }
  }
  return { byCode }
}

const applyCustomerGroupCodeMappings = (
  groups: {
    id: string
    name: string
    metadata: Record<string, unknown> | null
  }[],
  mappings: {
    code: string | null
    erp_code: string | null
    customer_group_id: string
  }[],
) => {
  const mappingsByGroupId = new Map(
    mappings.map((mapping) => [mapping.customer_group_id, mapping]),
  )

  return groups.map((group) => {
    const mapping = mappingsByGroupId.get(group.id)
    return mapping
      ? { ...group, code: mapping.code, erp_code: mapping.erp_code }
      : group
  })
}

const buildRules = (
  input: PriceListInput,
  groupIndex: PriceListCustomerGroupIndex,
): { customer_group_id: string[] } | undefined => {
  const customerGroupCode = input.customer_group_code
  if (customerGroupCode === undefined || customerGroupCode.length === 0) {
    return undefined
  }
  const group = groupIndex.byCode.get(customerGroupCode)
  if (!group) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Customer group code '${customerGroupCode}' was not found`,
    )
  }
  return { customer_group_id: [group.id] }
}

const buildPriceListPayload = (
  input: PriceListInput,
  groupIndex: PriceListCustomerGroupIndex,
) => {
  const rules = buildRules(input, groupIndex)
  return {
    description: input.description,
    ends_at: input.ends_at ?? null,
    starts_at: input.starts_at ?? null,
    status: input.status ?? "active",
    title: input.name,
    type: input.type ?? "sale",
    ...(rules ? { rules } : {}),
  }
}

const collectPriceIdentifiers = (prices: PriceInput[]): PriceIdentifierSets => {
  const skus = new Set<string>()
  const eans = new Set<string>()
  const variantIds = new Set<string>()
  for (const price of prices) {
    const { ean, sku, variant_id: variantId } = price
    if (
      price.identifier_type === "sku" &&
      sku !== undefined &&
      sku.length > 0
    ) {
      skus.add(sku)
    }
    if (
      price.identifier_type === "ean" &&
      ean !== undefined &&
      ean.length > 0
    ) {
      eans.add(ean)
    }
    if (
      price.identifier_type === "variant_id" &&
      variantId !== undefined &&
      variantId.length > 0
    ) {
      variantIds.add(variantId)
    }
  }
  return { eans, skus, variantIds }
}

const buildVariantMap = (
  field: "sku" | "ean" | "id",
  variants: Record<string, unknown>[],
): Map<string, string> => {
  const map = new Map<string, string>()
  for (const variant of variants) {
    const value = variant[field]
    const { id } = variant
    if (typeof value === "string" && typeof id === "string") {
      map.set(value, id)
    }
  }
  return map
}

const priceKey = (
  variantId: string,
  currencyCode: string,
  minQuantity: number | null | undefined,
): string => `${variantId}:${currencyCode.toLowerCase()}:${minQuantity ?? 1}`

const buildExistingPriceIndex = (
  prices: ExistingPrice[],
): Map<string, ExistingPrice> => {
  const byKey = new Map<string, ExistingPrice>()
  for (const price of prices) {
    const variantId = price.price_set?.variant?.id
    if (variantId === undefined || variantId.length === 0) {
      continue
    }
    byKey.set(
      priceKey(variantId, price.currency_code, price.min_quantity),
      price,
    )
  }
  return byKey
}

const applyCodeMappings = (
  priceLists: ExistingPriceList[],
  mappings: PriceListCodeMapping[],
): ExistingPriceList[] => {
  const codeByPriceListId = new Map(
    mappings.map((mapping) => [mapping.price_list_id, mapping.erp_code]),
  )
  return priceLists.map((priceList) => {
    const erpCode = codeByPriceListId.get(priceList.id)
    return {
      ...priceList,
      ...(erpCode === undefined ? {} : { erp_code: erpCode }),
    }
  })
}

const buildPriceEcho = (price: PriceInput) => ({
  identifier_type: price.identifier_type,
  ...(price.sku === undefined ? {} : { sku: price.sku }),
  ...(price.ean === undefined ? {} : { ean: price.ean }),
  ...(price.variant_id === undefined ? {} : { variant_id: price.variant_id }),
})

const resolveVariantId = (
  price: PriceInput,
  maps: VariantLookupMaps,
): string | undefined => {
  const { ean, sku, variant_id: variantId } = price
  if (price.identifier_type === "sku" && sku !== undefined && sku.length > 0) {
    return maps.bySku.get(sku)
  }
  if (price.identifier_type === "ean" && ean !== undefined && ean.length > 0) {
    return maps.byEan.get(ean)
  }
  if (
    price.identifier_type === "variant_id" &&
    variantId !== undefined &&
    variantId.length > 0
  ) {
    return maps.byId.get(variantId)
  }
  return undefined
}

const buildPriceBatchPayload = (
  prices: PriceInput[],
  variantMaps: VariantLookupMaps,
  existingPrices: Map<string, ExistingPrice>,
) => {
  const create: Record<string, unknown>[] = []
  const update: Record<string, unknown>[] = []
  const owners: { index: number; input: PriceInput }[] = []
  const results = Array.from<PriceListPriceResult>({ length: prices.length })

  for (const [index, price] of prices.entries()) {
    const variantId = resolveVariantId(price, variantMaps)
    if (variantId === undefined || variantId.length === 0) {
      results[index] = {
        ...buildPriceEcho(price),
        error: `No variant found for ${price.identifier_type}`,
        status: "not_found",
      }
      continue
    }
    const payload = {
      amount: price.amount,
      currency_code: price.currency_code.toLowerCase(),
      min_quantity: price.min_quantity ?? 1,
      variant_id: variantId,
    }
    const existing = existingPrices.get(
      priceKey(variantId, payload.currency_code, payload.min_quantity),
    )
    if (existing) {
      update.push({ ...payload, id: existing.id })
    } else {
      create.push(payload)
    }
    owners.push({ index, input: price })
  }

  return { create, owners, results, update }
}

const markPriceBatchSuccess = (
  owners: { index: number; input: PriceInput }[],
  results: PriceListPriceResult[],
): void => {
  for (const owner of owners) {
    results[owner.index] = {
      ...buildPriceEcho(owner.input),
      status: "updated",
    }
  }
}

export class PriceListsClientMapperHelper {
  readonly applyCodeMappings = applyCodeMappings
  readonly applyCustomerGroupCodeMappings = applyCustomerGroupCodeMappings
  readonly buildCustomerGroupIndex = buildCustomerGroupIndex
  readonly buildExistingPriceIndex = buildExistingPriceIndex
  readonly buildPriceBatchPayload = buildPriceBatchPayload
  readonly buildPriceListIndex = buildPriceListIndex
  readonly buildPriceListPayload = buildPriceListPayload
  readonly buildVariantMap = buildVariantMap
  readonly collectCustomerGroupCodes = collectCustomerGroupCodes
  readonly collectPriceIdentifiers = collectPriceIdentifiers
  readonly collectPriceListCodes = collectPriceListCodes
  readonly decodeDescription = decodeDescription
  readonly encodeDescription = encodeDescription
  readonly getPriceListCode = getPriceListCode
  readonly markPriceBatchSuccess = markPriceBatchSuccess
  readonly toListedPriceList = toListedPriceList
}

export const priceListsClientMapperHelper = new PriceListsClientMapperHelper()

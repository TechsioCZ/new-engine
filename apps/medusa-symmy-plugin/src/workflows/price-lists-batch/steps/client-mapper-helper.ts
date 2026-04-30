import type {
  ListedPriceList,
  PriceInput,
  PriceListInput,
  PriceListPriceResult,
} from "../types"
import type {
  ExistingPrice,
  ExistingPriceList,
  ExistingPriceListIndex,
  PriceListCustomerGroupIndex,
  VariantLookupMaps,
} from "./client"

const CODE_PREFIX = "[symmy_code:"
const CODE_SUFFIX = "]"
const LEADING_NEWLINE = /^\n/

export type PriceIdentifierSets = {
  skus: Set<string>
  eans: Set<string>
  variantIds: Set<string>
}

export class PriceListsClientMapperHelper {
  encodeDescription(code: string, description?: string | null) {
    return `${CODE_PREFIX}${code}${CODE_SUFFIX}\n${description ?? ""}`
  }

  decodeDescription(description?: string | null) {
    if (!description?.startsWith(CODE_PREFIX)) {
      return { code: null, description: description ?? undefined }
    }
    const end = description.indexOf(CODE_SUFFIX)
    if (end < 0) {
      return { code: null, description }
    }
    return {
      code: description.slice(CODE_PREFIX.length, end),
      description: description
        .slice(end + CODE_SUFFIX.length)
        .replace(LEADING_NEWLINE, ""),
    }
  }

  collectPriceListCodes(priceLists: PriceListInput[]): Set<string> {
    return new Set(priceLists.map((priceList) => priceList.code))
  }

  buildPriceListIndex(priceLists: ExistingPriceList[]): ExistingPriceListIndex {
    const byCode = new Map<string, ExistingPriceList>()
    for (const priceList of priceLists) {
      const { code } = this.decodeDescription(priceList.description)
      if (code) {
        byCode.set(code, priceList)
      }
    }
    return { byCode }
  }

  toListedPriceList(priceList: ExistingPriceList): ListedPriceList | null {
    const { code, description } = this.decodeDescription(priceList.description)
    if (!code) {
      return null
    }
    return {
      id: priceList.id,
      code,
      name: priceList.title,
      description,
      starts_at: priceList.starts_at,
      ends_at: priceList.ends_at,
    }
  }

  collectCustomerGroupCodes(priceLists: PriceListInput[]): Set<string> {
    return new Set(
      priceLists
        .map((priceList) => priceList.customer_group_code)
        .filter((code): code is string => Boolean(code))
    )
  }

  buildCustomerGroupIndex(
    groups: {
      id: string
      name: string
      metadata: Record<string, unknown> | null
    }[],
    codes: Set<string>
  ): PriceListCustomerGroupIndex {
    const byCode = new Map<string, { id: string }>()
    for (const group of groups) {
      for (const code of [
        group.name,
        this.stringMetadataValue(group.metadata, "code"),
        this.stringMetadataValue(group.metadata, "erp_code"),
      ]) {
        if (code && codes.has(code)) {
          byCode.set(code, group)
        }
      }
    }
    return { byCode }
  }

  buildPriceListPayload(
    input: PriceListInput,
    groupIndex: PriceListCustomerGroupIndex
  ) {
    const rules = this.buildRules(input, groupIndex)
    return {
      title: input.name,
      description: this.encodeDescription(input.code, input.description),
      starts_at: input.starts_at ?? null,
      ends_at: input.ends_at ?? null,
      status: input.status ?? "active",
      type: input.type ?? "sale",
      ...(rules ? { rules } : {}),
    }
  }

  collectPriceIdentifiers(prices: PriceInput[]): PriceIdentifierSets {
    const skus = new Set<string>()
    const eans = new Set<string>()
    const variantIds = new Set<string>()
    for (const price of prices) {
      if (price.identifier_type === "sku" && price.sku) {
        skus.add(price.sku)
      }
      if (price.identifier_type === "ean" && price.ean) {
        eans.add(price.ean)
      }
      if (price.identifier_type === "variant_id" && price.variant_id) {
        variantIds.add(price.variant_id)
      }
    }
    return { skus, eans, variantIds }
  }

  buildVariantMap(
    field: "sku" | "ean" | "id",
    variants: Record<string, unknown>[]
  ): Map<string, string> {
    const map = new Map<string, string>()
    for (const variant of variants) {
      const value = variant[field]
      const id = variant.id
      if (typeof value === "string" && typeof id === "string") {
        map.set(value, id)
      }
    }
    return map
  }

  buildExistingPriceIndex(prices: ExistingPrice[]) {
    const byKey = new Map<string, ExistingPrice>()
    for (const price of prices) {
      const variantId = price.price_set?.variant?.id
      if (!variantId) {
        continue
      }
      byKey.set(
        this.priceKey(variantId, price.currency_code, price.min_quantity),
        price
      )
    }
    return byKey
  }

  buildPriceBatchPayload(
    prices: PriceInput[],
    variantMaps: VariantLookupMaps,
    existingPrices: Map<string, ExistingPrice>
  ) {
    const create: Record<string, unknown>[] = []
    const update: Record<string, unknown>[] = []
    const owners: { index: number; input: PriceInput }[] = []
    const results: PriceListPriceResult[] = new Array(prices.length)

    for (const [index, price] of prices.entries()) {
      const variantId = this.resolveVariantId(price, variantMaps)
      if (!variantId) {
        results[index] = {
          ...this.buildPriceEcho(price),
          status: "not_found",
          error: `No variant found for ${price.identifier_type}`,
        }
        continue
      }
      const payload = {
        variant_id: variantId,
        currency_code: price.currency_code.toLowerCase(),
        amount: price.amount,
        min_quantity: price.min_quantity ?? 1,
      }
      const existing = existingPrices.get(
        this.priceKey(variantId, payload.currency_code, payload.min_quantity)
      )
      if (existing) {
        update.push({ ...payload, id: existing.id })
      } else {
        create.push(payload)
      }
      owners.push({ index, input: price })
    }

    return { create, update, owners, results }
  }

  markPriceBatchSuccess(
    owners: { index: number; input: PriceInput }[],
    results: PriceListPriceResult[]
  ): void {
    for (const owner of owners) {
      results[owner.index] = {
        ...this.buildPriceEcho(owner.input),
        status: "updated",
      }
    }
  }

  private buildRules(
    input: PriceListInput,
    groupIndex: PriceListCustomerGroupIndex
  ) {
    if (!input.customer_group_code) {
      return
    }
    const group = groupIndex.byCode.get(input.customer_group_code)
    if (!group) {
      throw new Error(
        `Customer group code '${input.customer_group_code}' was not found`
      )
    }
    return { customer_group_id: [group.id] }
  }

  private buildPriceEcho(price: PriceInput) {
    return {
      identifier_type: price.identifier_type,
      sku: price.sku,
      ean: price.ean,
      variant_id: price.variant_id,
    }
  }

  private resolveVariantId(price: PriceInput, maps: VariantLookupMaps) {
    if (price.identifier_type === "sku" && price.sku) {
      return maps.bySku.get(price.sku)
    }
    if (price.identifier_type === "ean" && price.ean) {
      return maps.byEan.get(price.ean)
    }
    if (price.identifier_type === "variant_id" && price.variant_id) {
      return maps.byId.get(price.variant_id)
    }
  }

  private priceKey(
    variantId: string,
    currencyCode: string,
    minQuantity: number | null | undefined
  ) {
    return `${variantId}:${currencyCode.toLowerCase()}:${minQuantity ?? 1}`
  }

  private stringMetadataValue(
    metadata: Record<string, unknown> | null | undefined,
    key: string
  ) {
    const value = metadata?.[key]
    return typeof value === "string" && value.length ? value : null
  }
}

export const priceListsClientMapperHelper = new PriceListsClientMapperHelper()

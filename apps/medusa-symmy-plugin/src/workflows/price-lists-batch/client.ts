import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  batchPriceListPricesWorkflow,
  createPriceListsWorkflow,
  updatePriceListsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  type PriceIdentifierSets,
  priceListsClientMapperHelper,
} from "./client-mapper-helper"
import type { ListedPriceList, PriceInput, PriceListInput } from "./types"

export type ExistingPriceList = {
  id: string
  title: string
  description: string | null
  starts_at: string | null
  ends_at: string | null
  status?: string
  type?: string
}

export type ExistingPriceListIndex = {
  byCode: Map<string, ExistingPriceList>
}

export type PriceListCustomerGroupIndex = {
  byCode: Map<string, { id: string }>
}

export type ExistingPrice = {
  id: string
  currency_code: string
  min_quantity: number | null
  price_set?: {
    variant?: {
      id?: string
    }
  }
}

export type VariantLookupMaps = {
  bySku: Map<string, string>
  byEan: Map<string, string>
  byId: Map<string, string>
}

export type PriceBatchApplyResult = {
  created: unknown[]
  updated: unknown[]
}

const PRICE_LIST_FIELDS = [
  "id",
  "title",
  "description",
  "starts_at",
  "ends_at",
  "status",
  "type",
] as const

const PRICE_FIELDS = [
  "id",
  "currency_code",
  "min_quantity",
  "price_set.variant.id",
] as const

const getQuery = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.QUERY)

export type Query = ReturnType<typeof getQuery>

export class PriceListsClient {
  private readonly container: MedusaContainer
  private readonly mapper = priceListsClientMapperHelper
  private readonly query: Query

  constructor(container: MedusaContainer) {
    this.container = container
    this.query = getQuery(container)
  }

  async preloadPriceLists(): Promise<ExistingPriceListIndex> {
    return this.mapper.buildPriceListIndex(await this.queryPriceLists())
  }

  async listPriceLists({
    code,
    limit,
    offset,
  }: {
    code?: string
    limit: number
    offset: number
  }) {
    const all = (await this.queryPriceLists())
      .map((priceList) => this.mapper.toListedPriceList(priceList))
      .filter((priceList): priceList is ListedPriceList => priceList !== null)
      .filter((priceList) => !code || priceList.code === code)
    const page = all.slice(offset, offset + limit)
    return {
      price_lists: page,
      count: all.length,
      offset,
      limit,
    }
  }

  async preloadCustomerGroups(
    priceLists: PriceListInput[]
  ): Promise<PriceListCustomerGroupIndex> {
    const codes = this.mapper.collectCustomerGroupCodes(priceLists)
    if (!codes.size) {
      return { byCode: new Map() }
    }
    const [nameGroups, metadataIds] = await Promise.all([
      this.queryCustomerGroups({ name: Array.from(codes) }),
      this.queryCustomerGroupIdsByMetadata(codes),
    ])
    const metadataGroups = await this.queryCustomerGroups({
      id: Array.from(metadataIds),
    })
    return this.mapper.buildCustomerGroupIndex(
      [...nameGroups, ...metadataGroups],
      codes
    )
  }

  async createPriceList(
    input: PriceListInput,
    groupIndex: PriceListCustomerGroupIndex
  ): Promise<ExistingPriceList> {
    const { result } = await createPriceListsWorkflow(this.container).run({
      input: {
        price_lists_data: [
          this.mapper.buildPriceListPayload(input, groupIndex),
        ] as never,
      },
    })
    const created = result?.[0] as unknown as ExistingPriceList | undefined
    if (!created) {
      throw new Error("createPriceListsWorkflow returned empty result")
    }
    return {
      ...created,
      description: this.mapper.encodeDescription(input.code, input.description),
    }
  }

  async updatePriceList(
    id: string,
    input: PriceListInput,
    groupIndex: PriceListCustomerGroupIndex
  ): Promise<void> {
    await updatePriceListsWorkflow(this.container).run({
      input: {
        price_lists_data: [
          {
            ...this.mapper.buildPriceListPayload(input, groupIndex),
            id,
          },
        ] as never,
      },
    })
  }

  async preloadVariants(prices: PriceInput[]): Promise<VariantLookupMaps> {
    const identifiers = this.mapper.collectPriceIdentifiers(prices)
    const [bySku, byEan, byId] = await Promise.all([
      this.queryVariants("sku", identifiers),
      this.queryVariants("ean", identifiers),
      this.queryVariants("id", identifiers),
    ])
    return { bySku, byEan, byId }
  }

  async preloadPrices(priceListId: string) {
    const { data } = await this.query.graph({
      entity: "price",
      fields: PRICE_FIELDS as unknown as string[],
      filters: { price_list_id: priceListId },
      pagination: { take: 10_000 },
    })
    return this.mapper.buildExistingPriceIndex((data ?? []) as ExistingPrice[])
  }

  async applyPrices(
    priceListId: string,
    create: Record<string, unknown>[],
    update: Record<string, unknown>[]
  ): Promise<PriceBatchApplyResult> {
    if (!(create.length || update.length)) {
      return { created: [], updated: [] }
    }
    const { result } = await batchPriceListPricesWorkflow(this.container).run({
      input: {
        data: {
          id: priceListId,
          create: create as never,
          update: update as never,
          delete: [],
        },
      },
    })
    return {
      created: result?.created ?? [],
      updated: result?.updated ?? [],
    }
  }

  private async queryPriceLists(): Promise<ExistingPriceList[]> {
    const { data } = await this.query.graph({
      entity: "price_list",
      fields: PRICE_LIST_FIELDS as unknown as string[],
      pagination: { take: 10_000 },
    })
    return (data ?? []) as ExistingPriceList[]
  }

  private async queryVariants(
    field: "sku" | "ean" | "id",
    identifiers: PriceIdentifierSets
  ): Promise<Map<string, string>> {
    let values: Set<string>
    if (field === "sku") {
      values = identifiers.skus
    } else if (field === "ean") {
      values = identifiers.eans
    } else {
      values = identifiers.variantIds
    }
    if (!values.size) {
      return new Map()
    }
    const { data } = await this.query.graph({
      entity: "variant",
      fields: ["id", field],
      filters: { [field]: Array.from(values) },
    })
    return this.mapper.buildVariantMap(
      field,
      (data ?? []) as Record<string, unknown>[]
    )
  }

  private async queryCustomerGroups(filters: Record<string, string[]>) {
    if (Object.values(filters).every((values) => values.length === 0)) {
      return []
    }
    const { data } = await this.query.graph({
      entity: "customer_group",
      fields: ["id", "name", "metadata"],
      filters,
    })
    return (data ?? []) as {
      id: string
      name: string
      metadata: Record<string, unknown> | null
    }[]
  }

  private async queryCustomerGroupIdsByMetadata(
    codes: Set<string>
  ): Promise<Set<string>> {
    const ids = new Set<string>()
    const [codeGroups, erpCodeGroups] = await Promise.all([
      this.query.graph({
        entity: "customer_group",
        fields: ["id"],
        filters: { metadata: { code: Array.from(codes) } },
      }),
      this.query.graph({
        entity: "customer_group",
        fields: ["id"],
        filters: { metadata: { erp_code: Array.from(codes) } },
      }),
    ])
    for (const row of [
      ...((codeGroups.data ?? []) as { id: string }[]),
      ...((erpCodeGroups.data ?? []) as { id: string }[]),
    ]) {
      ids.add(row.id)
    }
    return ids
  }
}

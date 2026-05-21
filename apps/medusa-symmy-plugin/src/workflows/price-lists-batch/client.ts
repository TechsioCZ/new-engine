import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  batchPriceListPricesWorkflow,
  createPriceListsWorkflow,
  updatePriceListsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  SYMMY_CUSTOMER_GROUP_CODE_MODULE,
  type SymmyCustomerGroupCodeModuleService,
} from "../../modules/customer-group-code"
import {
  SYMMY_PRICE_LIST_CODE_MODULE,
  type SymmyPriceListCodeDTO,
  type SymmyPriceListCodeModuleService,
} from "../../modules/price-list-code"
import {
  type PriceIdentifierSets,
  priceListsClientMapperHelper,
} from "./client-mapper-helper"
import type { ListedPriceList, PriceInput, PriceListInput } from "./types"

export type ExistingPriceList = {
  id: string
  title: string
  description: string | null
  erp_code?: string
  metadata: Record<string, unknown> | null
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
  priceSetByVariantId: Map<string, string>
}

export type PriceBatchApplyResult = {
  created: unknown[]
  updated: unknown[]
}

export type PriceListCodeMapping = Pick<
  SymmyPriceListCodeDTO,
  "erp_code" | "price_list_id"
>

const PRICE_LIST_FIELDS = [
  "id",
  "title",
  "description",
  "metadata",
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

type VariantQueryResult = {
  byField: Map<string, string>
  priceSetByVariantId: Map<string, string>
}

const getQuery = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.QUERY)

export type Query = ReturnType<typeof getQuery>

export class PriceListsClient {
  private readonly container: MedusaContainer
  private readonly customerGroupCodeService: SymmyCustomerGroupCodeModuleService
  private readonly mapper = priceListsClientMapperHelper
  private readonly priceListCodeService: SymmyPriceListCodeModuleService
  private readonly query: Query

  constructor(container: MedusaContainer) {
    this.container = container
    this.customerGroupCodeService =
      container.resolve<SymmyCustomerGroupCodeModuleService>(
        SYMMY_CUSTOMER_GROUP_CODE_MODULE
      )
    this.priceListCodeService =
      container.resolve<SymmyPriceListCodeModuleService>(
        SYMMY_PRICE_LIST_CODE_MODULE
      )
    this.query = getQuery(container)
  }

  async preloadPriceLists(
    priceLists?: PriceListInput[]
  ): Promise<ExistingPriceListIndex> {
    if (!priceLists) {
      return { byCode: new Map() }
    }

    return this.mapper.buildPriceListIndex(
      await this.queryPriceListsByCodes(
        this.mapper.collectPriceListCodes(priceLists)
      )
    )
  }

  async preloadPriceListsByCodes(
    codes: Set<string>
  ): Promise<ExistingPriceListIndex> {
    return this.mapper.buildPriceListIndex(
      await this.queryPriceListsByCodes(codes)
    )
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
    const { mappings, count } = await this.priceListCodeService.listPage({
      erpCode: code,
      limit,
      offset,
    })
    const priceListsById = await this.queryPriceListsByIds(
      new Set(mappings.map((mapping) => mapping.price_list_id))
    )
    const price_lists = mappings
      .flatMap((mapping) => {
        const priceList = priceListsById.get(mapping.price_list_id)
        return priceList ? [{ ...priceList, erp_code: mapping.erp_code }] : []
      })
      .map((priceList) => this.mapper.toListedPriceList(priceList))
      .filter((priceList): priceList is ListedPriceList => priceList !== null)
    return {
      price_lists,
      count,
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
    const [nameGroups, codeMappings] = await Promise.all([
      this.queryCustomerGroups({ name: Array.from(codes) }),
      this.customerGroupCodeService.listByCodes(codes),
    ])
    const codeGroups = await this.queryCustomerGroups({
      id: codeMappings.map((mapping) => mapping.customer_group_id),
    })
    return this.mapper.buildCustomerGroupIndex(
      [
        ...nameGroups,
        ...this.mapper.applyCustomerGroupCodeMappings(codeGroups, codeMappings),
      ],
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
    await this.priceListCodeService.upsertCode({
      erpCode: input.code,
      priceListId: created.id,
    })
    return {
      ...created,
      description: input.description ?? null,
      erp_code: input.code,
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
    await this.priceListCodeService.upsertCode({
      erpCode: input.code,
      priceListId: id,
    })
  }

  async preloadVariants(prices: PriceInput[]): Promise<VariantLookupMaps> {
    const identifiers = this.mapper.collectPriceIdentifiers(prices)
    const [bySku, byEan, byId] = await Promise.all([
      this.queryVariants("sku", identifiers),
      this.queryVariants("ean", identifiers),
      this.queryVariants("id", identifiers),
    ])
    return {
      bySku: bySku.byField,
      byEan: byEan.byField,
      byId: byId.byField,
      priceSetByVariantId: new Map([
        ...bySku.priceSetByVariantId,
        ...byEan.priceSetByVariantId,
        ...byId.priceSetByVariantId,
      ]),
    }
  }

  async preloadPrices(
    priceListId: string,
    prices: PriceInput[],
    variantMaps: VariantLookupMaps
  ) {
    const priceSetIds = new Set<string>()
    const currencyCodes = new Set<string>()

    for (const price of prices) {
      const variantId = this.resolvePriceVariantId(price, variantMaps)
      const priceSetId = variantId
        ? variantMaps.priceSetByVariantId.get(variantId)
        : undefined
      if (priceSetId) {
        priceSetIds.add(priceSetId)
        currencyCodes.add(price.currency_code.toLowerCase())
      }
    }

    if (!priceSetIds.size) {
      return this.mapper.buildExistingPriceIndex([])
    }

    const { data } = await this.query.graph({
      entity: "price",
      fields: PRICE_FIELDS as unknown as string[],
      filters: {
        price_list_id: priceListId,
        price_set_id: Array.from(priceSetIds),
        currency_code: Array.from(currencyCodes),
      },
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

  private async queryPriceListsByIds(
    ids: Set<string>
  ): Promise<Map<string, ExistingPriceList>> {
    if (!ids.size) {
      return new Map()
    }
    const { data } = await this.query.graph({
      entity: "price_list",
      fields: PRICE_LIST_FIELDS as unknown as string[],
      filters: { id: Array.from(ids) },
    })
    return new Map(
      ((data ?? []) as ExistingPriceList[]).map((priceList) => [
        priceList.id,
        priceList,
      ])
    )
  }

  private async queryPriceListsByCodes(
    codes: Set<string>
  ): Promise<ExistingPriceList[]> {
    if (!codes.size) {
      return []
    }

    const mappings = await this.priceListCodeService.listByErpCodes(codes)
    const priceListsById = await this.queryPriceListsByIds(
      new Set(mappings.map((mapping) => mapping.price_list_id))
    )
    return this.mapper.applyCodeMappings(
      Array.from(priceListsById.values()),
      mappings
    )
  }

  private async queryVariants(
    field: "sku" | "ean" | "id",
    identifiers: PriceIdentifierSets
  ): Promise<VariantQueryResult> {
    let values: Set<string>
    if (field === "sku") {
      values = identifiers.skus
    } else if (field === "ean") {
      values = identifiers.eans
    } else {
      values = identifiers.variantIds
    }
    if (!values.size) {
      return { byField: new Map(), priceSetByVariantId: new Map() }
    }
    const { data } = await this.query.graph({
      entity: "variant",
      fields: ["id", field, "price_set.id"],
      filters: { [field]: Array.from(values) },
    })
    const variants = (data ?? []) as Record<string, unknown>[]
    return {
      byField: this.mapper.buildVariantMap(field, variants),
      priceSetByVariantId: this.buildVariantPriceSetMap(variants),
    }
  }

  private buildVariantPriceSetMap(
    variants: Record<string, unknown>[]
  ): Map<string, string> {
    const map = new Map<string, string>()
    for (const variant of variants) {
      const id = variant.id
      const priceSet = variant.price_set
      const priceSetId =
        priceSet && typeof priceSet === "object" && "id" in priceSet
          ? priceSet.id
          : undefined
      if (typeof id === "string" && typeof priceSetId === "string") {
        map.set(id, priceSetId)
      }
    }
    return map
  }

  private resolvePriceVariantId(
    price: PriceInput,
    variantMaps: VariantLookupMaps
  ) {
    if (price.identifier_type === "sku" && price.sku) {
      return variantMaps.bySku.get(price.sku)
    }
    if (price.identifier_type === "ean" && price.ean) {
      return variantMaps.byEan.get(price.ean)
    }
    if (price.identifier_type === "variant_id" && price.variant_id) {
      return variantMaps.byId.get(price.variant_id)
    }
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
}

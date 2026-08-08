import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  batchPriceListPricesWorkflow,
  createPriceListsWorkflow,
  updatePriceListsWorkflow,
} from "@medusajs/medusa/core-flows"

import { SYMMY_CUSTOMER_GROUP_CODE_MODULE } from "../../modules/customer-group-code"
import type { SymmyCustomerGroupCodeModuleService } from "../../modules/customer-group-code"
import { SYMMY_PRICE_LIST_CODE_MODULE } from "../../modules/price-list-code"
import type {
  SymmyPriceListCodeDTO,
  SymmyPriceListCodeModuleService,
} from "../../modules/price-list-code"
import { priceListsClientMapperHelper } from "./client-mapper-helper"
import type { PriceIdentifierSets } from "./client-mapper-helper"
import type { ListedPriceList, PriceInput, PriceListInput } from "./types"

export interface ExistingPriceList {
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

export interface ExistingPriceListIndex {
  byCode: Map<string, ExistingPriceList>
}

export interface PriceListCustomerGroupIndex {
  byCode: Map<string, { id: string }>
}

export interface ExistingPrice {
  id: string
  currency_code: string
  min_quantity: number | null
  price_set?: {
    variant?: {
      id?: string
    }
  }
}

export interface VariantLookupMaps {
  bySku: Map<string, string>
  byEan: Map<string, string>
  byId: Map<string, string>
  priceSetByVariantId: Map<string, string>
}

export interface PriceBatchApplyResult {
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

interface VariantQueryResult {
  byField: Map<string, string>
  priceSetByVariantId: Map<string, string>
}

const isObjectMap = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const getObjectValue = (value: unknown, key: string): unknown =>
  isObjectMap(value) ? value[key] : undefined

const decodePriceList = (value: unknown): ExistingPriceList | null => {
  const id = getObjectValue(value, "id")
  const title = getObjectValue(value, "title")
  if (typeof id !== "string" || typeof title !== "string") {
    return null
  }
  const description = getObjectValue(value, "description") ?? null
  const metadata = getObjectValue(value, "metadata") ?? null
  const startsAt = getObjectValue(value, "starts_at") ?? null
  const endsAt = getObjectValue(value, "ends_at") ?? null
  if (description !== null && typeof description !== "string") {
    return null
  }
  if (metadata !== null && !isObjectMap(metadata)) {
    return null
  }
  if (startsAt !== null && typeof startsAt !== "string") {
    return null
  }
  if (endsAt !== null && typeof endsAt !== "string") {
    return null
  }
  const status = getObjectValue(value, "status")
  const type = getObjectValue(value, "type")
  return {
    description,
    ends_at: endsAt,
    id,
    metadata,
    starts_at: startsAt,
    title,
    ...(typeof status === "string" ? { status } : {}),
    ...(typeof type === "string" ? { type } : {}),
  }
}

const decodeExistingPrice = (value: unknown): ExistingPrice | null => {
  const id = getObjectValue(value, "id")
  const currencyCode = getObjectValue(value, "currency_code")
  if (typeof id !== "string" || typeof currencyCode !== "string") {
    return null
  }
  const minQuantity = getObjectValue(value, "min_quantity") ?? null
  if (minQuantity !== null && typeof minQuantity !== "number") {
    return null
  }
  const priceSet = getObjectValue(value, "price_set")
  const variant = getObjectValue(priceSet, "variant")
  const variantId = getObjectValue(variant, "id")
  return {
    currency_code: currencyCode,
    id,
    min_quantity: minQuantity,
    ...(typeof variantId === "string"
      ? { price_set: { variant: { id: variantId } } }
      : {}),
  }
}

const buildVariantPriceSetMap = (
  variants: Record<string, unknown>[],
): Map<string, string> => {
  const map = new Map<string, string>()
  for (const variant of variants) {
    const id = getObjectValue(variant, "id")
    const priceSetId = getObjectValue(
      getObjectValue(variant, "price_set"),
      "id",
    )
    if (typeof id === "string" && typeof priceSetId === "string") {
      map.set(id, priceSetId)
    }
  }
  return map
}

const resolvePriceVariantId = (
  price: PriceInput,
  variantMaps: VariantLookupMaps,
): string | undefined => {
  if (price.identifier_type === "sku" && price.sku !== undefined) {
    return variantMaps.bySku.get(price.sku)
  }
  if (price.identifier_type === "ean" && price.ean !== undefined) {
    return variantMaps.byEan.get(price.ean)
  }
  if (
    price.identifier_type === "variant_id" &&
    price.variant_id !== undefined
  ) {
    return variantMaps.byId.get(price.variant_id)
  }
  return undefined
}

interface CreatePricePayload {
  amount: number
  currency_code: string
  min_quantity: number
  variant_id: string
}

interface UpdatePricePayload extends CreatePricePayload {
  id: string
}

const decodeCreatePricePayload = (
  value: Record<string, unknown>,
): CreatePricePayload => {
  const amount = getObjectValue(value, "amount")
  const currencyCode = getObjectValue(value, "currency_code")
  const minQuantity = getObjectValue(value, "min_quantity")
  const variantId = getObjectValue(value, "variant_id")
  if (
    typeof amount !== "number" ||
    typeof currencyCode !== "string" ||
    typeof minQuantity !== "number" ||
    typeof variantId !== "string"
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid price create payload",
    )
  }
  return {
    amount,
    currency_code: currencyCode,
    min_quantity: minQuantity,
    variant_id: variantId,
  }
}

const decodeUpdatePricePayload = (
  value: Record<string, unknown>,
): UpdatePricePayload => {
  const create = decodeCreatePricePayload(value)
  const id = getObjectValue(value, "id")
  if (typeof id !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid price update payload",
    )
  }
  return { ...create, id }
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
        SYMMY_CUSTOMER_GROUP_CODE_MODULE,
      )
    this.priceListCodeService =
      container.resolve<SymmyPriceListCodeModuleService>(
        SYMMY_PRICE_LIST_CODE_MODULE,
      )
    this.query = getQuery(container)
  }

  async preloadPriceLists(
    priceLists?: PriceListInput[],
  ): Promise<ExistingPriceListIndex> {
    if (priceLists === undefined) {
      return { byCode: new Map() }
    }

    return this.mapper.buildPriceListIndex(
      await this.queryPriceListsByCodes(
        this.mapper.collectPriceListCodes(priceLists),
      ),
    )
  }

  async preloadPriceListsByCodes(
    codes: Set<string>,
  ): Promise<ExistingPriceListIndex> {
    return this.mapper.buildPriceListIndex(
      await this.queryPriceListsByCodes(codes),
    )
  }

  async listPriceLists({
    code,
    limit,
    offset,
  }: {
    code?: string | undefined
    limit: number
    offset: number
  }) {
    const { mappings, count } = await this.priceListCodeService.listPage({
      ...(code === undefined ? {} : { erpCode: code }),
      limit,
      offset,
    })
    const priceListsById = await this.queryPriceListsByIds(
      new Set(mappings.map((mapping) => mapping.price_list_id)),
    )
    const priceLists = mappings.flatMap((mapping): ListedPriceList[] => {
      const priceList = priceListsById.get(mapping.price_list_id)
      if (priceList === undefined) {
        return []
      }
      const listed = this.mapper.toListedPriceList({
        ...priceList,
        erp_code: mapping.erp_code,
      })
      return listed === null ? [] : [listed]
    })
    return {
      count,
      limit,
      offset,
      price_lists: priceLists,
    }
  }

  async preloadCustomerGroups(
    priceLists: PriceListInput[],
  ): Promise<PriceListCustomerGroupIndex> {
    const codes = this.mapper.collectCustomerGroupCodes(priceLists)
    if (codes.size === 0) {
      return { byCode: new Map() }
    }
    const [nameGroups, codeMappings] = await Promise.all([
      this.queryCustomerGroups({ name: [...codes] }),
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
      codes,
    )
  }

  async createPriceList(
    input: PriceListInput,
    groupIndex: PriceListCustomerGroupIndex,
  ): Promise<ExistingPriceList> {
    const { result } = await createPriceListsWorkflow(this.container).run({
      input: {
        price_lists_data: [
          {
            ...this.mapper.buildPriceListPayload(input, groupIndex),
            description: input.description ?? "",
          },
        ],
      },
    })
    const workflowResult: unknown = result
    const first: unknown = Array.isArray(workflowResult)
      ? workflowResult[0]
      : undefined
    const created = decodePriceList(first)
    if (created === null) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "createPriceListsWorkflow returned empty result",
      )
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
    groupIndex: PriceListCustomerGroupIndex,
  ): Promise<void> {
    await updatePriceListsWorkflow(this.container).run({
      input: {
        price_lists_data: [
          {
            ...this.mapper.buildPriceListPayload(input, groupIndex),
            description: input.description ?? null,
            id,
          },
        ],
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
      byEan: byEan.byField,
      byId: byId.byField,
      bySku: bySku.byField,
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
    variantMaps: VariantLookupMaps,
  ) {
    const priceSetIds = new Set<string>()
    const currencyCodes = new Set<string>()

    for (const price of prices) {
      const variantId = resolvePriceVariantId(price, variantMaps)
      const priceSetId =
        variantId === undefined
          ? undefined
          : variantMaps.priceSetByVariantId.get(variantId)
      if (priceSetId !== undefined) {
        priceSetIds.add(priceSetId)
        currencyCodes.add(price.currency_code.toLowerCase())
      }
    }

    if (priceSetIds.size === 0) {
      return this.mapper.buildExistingPriceIndex([])
    }

    const { data } = await this.query.graph({
      entity: "price",
      fields: [...PRICE_FIELDS],
      filters: {
        currency_code: [...currencyCodes],
        price_list_id: priceListId,
        price_set_id: [...priceSetIds],
      },
    })

    const rows: unknown[] = data ?? []
    return this.mapper.buildExistingPriceIndex(
      rows.flatMap((row) => {
        const price = decodeExistingPrice(row)
        return price === null ? [] : [price]
      }),
    )
  }

  async applyPrices(
    priceListId: string,
    create: Record<string, unknown>[],
    update: Record<string, unknown>[],
  ): Promise<PriceBatchApplyResult> {
    if (create.length === 0 && update.length === 0) {
      return { created: [], updated: [] }
    }
    const { result } = await batchPriceListPricesWorkflow(this.container).run({
      input: {
        data: {
          create: create.map(decodeCreatePricePayload),
          delete: [],
          id: priceListId,
          update: update.map(decodeUpdatePricePayload),
        },
      },
    })
    const workflowResult: unknown = result
    if (!isObjectMap(workflowResult)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Price batch workflow returned an invalid result",
      )
    }
    const rawCreated = getObjectValue(workflowResult, "created")
    const rawUpdated = getObjectValue(workflowResult, "updated")
    const created: unknown[] = Array.isArray(rawCreated) ? rawCreated : []
    const updated: unknown[] = Array.isArray(rawUpdated) ? rawUpdated : []
    return { created, updated }
  }

  private async queryPriceListsByIds(
    ids: Set<string>,
  ): Promise<Map<string, ExistingPriceList>> {
    if (ids.size === 0) {
      return new Map()
    }
    const { data } = await this.query.graph({
      entity: "price_list",
      fields: [...PRICE_LIST_FIELDS],
      filters: { id: [...ids] },
    })
    const byId = new Map<string, ExistingPriceList>()
    const rows: unknown[] = data ?? []
    for (const row of rows) {
      const priceList = decodePriceList(row)
      if (priceList !== null) {
        byId.set(priceList.id, priceList)
      }
    }
    return byId
  }

  private async queryPriceListsByCodes(
    codes: Set<string>,
  ): Promise<ExistingPriceList[]> {
    if (codes.size === 0) {
      return []
    }

    const mappings = await this.priceListCodeService.listByErpCodes(codes)
    const priceListsById = await this.queryPriceListsByIds(
      new Set(mappings.map((mapping) => mapping.price_list_id)),
    )
    return this.mapper.applyCodeMappings([...priceListsById.values()], mappings)
  }

  private async queryVariants(
    field: "sku" | "ean" | "id",
    identifiers: PriceIdentifierSets,
  ): Promise<VariantQueryResult> {
    let values: Set<string>
    if (field === "sku") {
      values = identifiers.skus
    } else if (field === "ean") {
      values = identifiers.eans
    } else {
      values = identifiers.variantIds
    }
    if (values.size === 0) {
      return { byField: new Map(), priceSetByVariantId: new Map() }
    }
    const { data } = await this.query.graph({
      entity: "variant",
      fields: ["id", field, "price_set.id"],
      filters: { [field]: [...values] },
    })
    const rows: unknown[] = data ?? []
    const variants = rows.filter(isObjectMap)
    return {
      byField: this.mapper.buildVariantMap(field, variants),
      priceSetByVariantId: buildVariantPriceSetMap(variants),
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
    const rows: unknown[] = data ?? []
    return rows.flatMap((row) => {
      const id = getObjectValue(row, "id")
      const name = getObjectValue(row, "name")
      if (typeof id !== "string" || typeof name !== "string") {
        return []
      }
      const metadata = getObjectValue(row, "metadata") ?? null
      if (metadata !== null && !isObjectMap(metadata)) {
        return []
      }
      return [{ id, metadata, name }]
    })
  }
}

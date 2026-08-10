import type {
  CustomerGroupDTO,
  ICustomerModuleService,
  IPricingModuleService,
  IProductModuleService,
  Logger,
  PriceDTO,
  PriceListDTO,
  ProductDTO,
  RemoteQueryFunction,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "@medusajs/framework/zod"
import {
  batchPriceListPricesWorkflow,
  createCustomerGroupsWorkflow,
  createPriceListsWorkflow,
  updateCustomerGroupsWorkflow,
  updatePriceListsWorkflow,
} from "@medusajs/medusa/core-flows"

interface PriceListPriceInput {
  productHandle: string
  variantSku: string
  amount: number
  currencyCode: string
}

interface OverridePriceListInput {
  title: string
  customerGroupName: string
  prices: PriceListPriceInput[]
}

interface SalePriceListInput {
  title: string
  sourceTitle: string
  customerGroupName?: string | undefined
  startsAt?: string | undefined
  endsAt?: string | undefined
  prices: PriceListPriceInput[]
}

export interface SyncPriceListsStepConfig {
  metadataSource?: string | undefined
  logLabel?: string | undefined
  customerGroupRuleAttribute?: string | undefined
  descriptions?: {
    override?: string | undefined
    sale?: string | undefined
  }
  sourceTypes?: {
    override?: string | undefined
    sale?: string | undefined
    customerGroup?: string | undefined
  }
  metadataKeys?: {
    priceListTitle?: string | undefined
    startsAt?: string | undefined
    endsAt?: string | undefined
  }
}

interface ResolvedSyncPriceListsStepConfig {
  metadataSource: string
  logLabel: string
  customerGroupRuleAttribute: string
  descriptions: {
    override: string
    sale: string
  }
  sourceTypes: {
    override: string
    sale: string
    customerGroup: string
  }
  metadataKeys: {
    priceListTitle: string
    startsAt: string
    endsAt: string
  }
}

export interface SyncPriceListsStepInput {
  productIds: string[]
  priceLists?: {
    overrides: OverridePriceListInput[]
    sales: SalePriceListInput[]
  }
  config?: SyncPriceListsStepConfig | undefined
}

interface PriceListSyncEntry {
  title: string
  description: string
  type: "override" | "sale"
  startsAt?: string | undefined
  endsAt?: string | undefined
  customerGroupName?: string | undefined
  prices: PriceListPriceInput[]
  metadata: z.output<typeof priceListMetadataSchema>
}

interface VariantLookup {
  id: string
  sku: string
}

interface VariantPriceSetLink {
  variant_id: string
  price_set_id: string
}

interface AmountValueHolder {
  value: number | string
}

interface PriceListPriceCreatePayload {
  amount: number
  currency_code: string
  variant_id: string
}

interface PriceListPriceUpdatePayload {
  id: string
  amount: number
  currency_code: string
  variant_id: string
}

interface PriceListPriceChanges {
  create: PriceListPriceCreatePayload[]
  update: PriceListPriceUpdatePayload[]
  skipped: number
}

interface PriceSyncTotals {
  created: number
  updated: number
  skipped: number
}

type PriceListWithPrices = PriceListDTO & {
  prices?: PriceDTO[] | undefined
}

type CustomerGroupWorkflowContainer = Parameters<
  typeof createCustomerGroupsWorkflow
>[0]
type PriceListWorkflowContainer = Parameters<typeof createPriceListsWorkflow>[0]
type PriceListPricesWorkflowContainer = Parameters<
  typeof batchPriceListPricesWorkflow
>[0]

const SyncPriceListsStepId = "sync-price-lists-seed-step"
const DEFAULT_SYNC_PRICE_LISTS_CONFIG = {
  customerGroupRuleAttribute: "customer.groups.id",
  descriptions: {
    override: "Seed price list: {title}",
    sale: "Seed sale prices for {sourceTitle}",
  },
  logLabel: "price lists",
  metadataKeys: {
    endsAt: "ends_at",
    priceListTitle: "source_price_list_title",
    startsAt: "starts_at",
  },
  metadataSource: "seed-price-lists",
  sourceTypes: {
    customerGroup: "price_list_customer_group",
    override: "price_list",
    sale: "sale",
  },
} satisfies ResolvedSyncPriceListsStepConfig

const priceListMetadataSchema = z.record(z.string(), z.json())

const hasText = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== ""

const isNumberOrString = (value: unknown): value is number | string =>
  typeof value === "number" || typeof value === "string"

const resolveDescriptions = (
  config: SyncPriceListsStepConfig | undefined,
): ResolvedSyncPriceListsStepConfig["descriptions"] => ({
  override:
    config?.descriptions?.override ??
    DEFAULT_SYNC_PRICE_LISTS_CONFIG.descriptions.override,
  sale:
    config?.descriptions?.sale ??
    DEFAULT_SYNC_PRICE_LISTS_CONFIG.descriptions.sale,
})

const resolveMetadataKeys = (
  config: SyncPriceListsStepConfig | undefined,
): ResolvedSyncPriceListsStepConfig["metadataKeys"] => ({
  endsAt:
    config?.metadataKeys?.endsAt ??
    DEFAULT_SYNC_PRICE_LISTS_CONFIG.metadataKeys.endsAt,
  priceListTitle:
    config?.metadataKeys?.priceListTitle ??
    DEFAULT_SYNC_PRICE_LISTS_CONFIG.metadataKeys.priceListTitle,
  startsAt:
    config?.metadataKeys?.startsAt ??
    DEFAULT_SYNC_PRICE_LISTS_CONFIG.metadataKeys.startsAt,
})

const resolveSourceTypes = (
  config: SyncPriceListsStepConfig | undefined,
): ResolvedSyncPriceListsStepConfig["sourceTypes"] => ({
  customerGroup:
    config?.sourceTypes?.customerGroup ??
    DEFAULT_SYNC_PRICE_LISTS_CONFIG.sourceTypes.customerGroup,
  override:
    config?.sourceTypes?.override ??
    DEFAULT_SYNC_PRICE_LISTS_CONFIG.sourceTypes.override,
  sale:
    config?.sourceTypes?.sale ??
    DEFAULT_SYNC_PRICE_LISTS_CONFIG.sourceTypes.sale,
})

const resolveSyncPriceListsConfig = (
  config?: SyncPriceListsStepConfig,
): ResolvedSyncPriceListsStepConfig => ({
  customerGroupRuleAttribute:
    config?.customerGroupRuleAttribute ??
    DEFAULT_SYNC_PRICE_LISTS_CONFIG.customerGroupRuleAttribute,
  descriptions: resolveDescriptions(config),
  logLabel: config?.logLabel ?? DEFAULT_SYNC_PRICE_LISTS_CONFIG.logLabel,
  metadataKeys: resolveMetadataKeys(config),
  metadataSource:
    config?.metadataSource ?? DEFAULT_SYNC_PRICE_LISTS_CONFIG.metadataSource,
  sourceTypes: resolveSourceTypes(config),
})

const formatTemplate = (
  template: string,
  values: Record<string, string | undefined>,
): string =>
  template.replaceAll(
    /\{(?<placeholder>[a-zA-Z0-9_]+)\}/gu,
    (_match, key: string) => values[key] ?? "",
  )

const buildPriceListMetadata = (
  config: ResolvedSyncPriceListsStepConfig,
  sourceType: string,
  priceListTitle: string,
  dates?: { startsAt?: string; endsAt?: string },
): z.output<typeof priceListMetadataSchema> => ({
  source: config.metadataSource,
  source_type: sourceType,
  [config.metadataKeys.priceListTitle]: priceListTitle,
  ...(hasText(dates?.startsAt)
    ? { [config.metadataKeys.startsAt]: dates.startsAt }
    : {}),
  ...(hasText(dates?.endsAt)
    ? { [config.metadataKeys.endsAt]: dates.endsAt }
    : {}),
})

const normalizeCurrencyCode = (value: string): string => value.toLowerCase()

const hasAmountValue = (value: unknown): value is AmountValueHolder =>
  typeof value === "object" &&
  value !== null &&
  "value" in value &&
  isNumberOrString(value.value)

const amountsEqual = (left: unknown, right: number): boolean => {
  let parsed = Number.NaN

  if (typeof left === "number") {
    parsed = left
  } else if (typeof left === "string") {
    parsed = Number(left)
  } else if (hasAmountValue(left)) {
    parsed = Number(left.value)
  }

  return Number.isFinite(parsed) && Math.abs(parsed - right) < 0.000001
}

const buildPriceListEntries = (
  priceLists?: SyncPriceListsStepInput["priceLists"],
  config: ResolvedSyncPriceListsStepConfig = resolveSyncPriceListsConfig(),
): PriceListSyncEntry[] => {
  if (!priceLists) {
    return []
  }

  return [
    ...priceLists.overrides.map((priceList) => ({
      customerGroupName: priceList.customerGroupName,
      description: formatTemplate(config.descriptions.override, {
        sourceTitle: priceList.title,
        title: priceList.title,
      }),
      metadata: buildPriceListMetadata(
        config,
        config.sourceTypes.override,
        priceList.title,
      ),
      prices: priceList.prices,
      title: priceList.title,
      type: "override" as const,
    })),
    ...priceLists.sales.map((priceList) => ({
      customerGroupName: priceList.customerGroupName,
      description: formatTemplate(config.descriptions.sale, {
        sourceTitle: priceList.sourceTitle,
        title: priceList.title,
      }),
      endsAt: priceList.endsAt,
      metadata: buildPriceListMetadata(
        config,
        config.sourceTypes.sale,
        priceList.sourceTitle,
        {
          ...(hasText(priceList.startsAt)
            ? { startsAt: priceList.startsAt }
            : {}),
          ...(hasText(priceList.endsAt) ? { endsAt: priceList.endsAt } : {}),
        },
      ),
      prices: priceList.prices,
      startsAt: priceList.startsAt,
      title: priceList.title,
      type: "sale" as const,
    })),
  ]
}

const buildVariantLookup = (
  products: ProductDTO[],
): Map<string, VariantLookup> => {
  const variants = new Map<string, VariantLookup>()

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (hasText(variant.sku)) {
        variants.set(`${product.handle}:${variant.sku}`, {
          id: variant.id,
          sku: variant.sku,
        })
      }
    }
  }

  return variants
}

const variantPriceSetLinksSchema = z.array(
  z.object({
    price_set_id: z.string(),
    variant_id: z.string(),
  }),
)

const toVariantPriceSetLinks = (value: unknown): VariantPriceSetLink[] => {
  const parsed = variantPriceSetLinksSchema.safeParse(value)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Unexpected product variant price-set link response shape.",
    )
  }

  return parsed.data
}

const ensureCustomerGroup = async (params: {
  config: ResolvedSyncPriceListsStepConfig
  container: CustomerGroupWorkflowContainer
  customerService: ICustomerModuleService
  name: string
  result: Map<string, CustomerGroupDTO>
}): Promise<void> => {
  const { config, container, customerService, name, result } = params
  const existing = await customerService.listCustomerGroups(
    { name },
    { take: 1 },
  )
  const metadata = {
    source: config.metadataSource,
    source_type: config.sourceTypes.customerGroup,
    [config.metadataKeys.priceListTitle]: name,
  }
  const [existingGroup] = existing

  if (existingGroup) {
    const { result: updated } = await updateCustomerGroupsWorkflow(
      container,
    ).run({
      input: {
        selector: { id: existingGroup.id },
        update: { metadata },
      },
    })
    result.set(name, updated[0] ?? existingGroup)
    return
  }

  const { result: created } = await createCustomerGroupsWorkflow(container).run(
    {
      input: {
        customersData: [
          {
            metadata,
            name,
          },
        ],
      },
    },
  )
  if (created[0]) {
    result.set(name, created[0])
  }
}

const runEnsureCustomerGroups = async (params: {
  config: ResolvedSyncPriceListsStepConfig
  container: CustomerGroupWorkflowContainer
  customerService: ICustomerModuleService
  names: string[]
  offset?: number
  result: Map<string, CustomerGroupDTO>
}): Promise<void> => {
  const offset = params.offset ?? 0
  const name = params.names[offset]
  if (name === undefined) {
    return
  }

  await ensureCustomerGroup({
    config: params.config,
    container: params.container,
    customerService: params.customerService,
    name,
    result: params.result,
  })
  await runEnsureCustomerGroups({ ...params, offset: offset + 1 })
}

const ensureCustomerGroups = async (
  entries: PriceListSyncEntry[],
  customerService: ICustomerModuleService,
  container: CustomerGroupWorkflowContainer,
  config: ResolvedSyncPriceListsStepConfig,
): Promise<Map<string, CustomerGroupDTO>> => {
  const names = [
    ...new Set(entries.map((entry) => entry.customerGroupName).filter(hasText)),
  ]
  const result = new Map<string, CustomerGroupDTO>()

  await runEnsureCustomerGroups({
    config,
    container,
    customerService,
    names,
    result,
  })

  return result
}

const findPriceListByTitle = async (
  pricingService: IPricingModuleService,
  title: string,
): Promise<PriceListWithPrices | undefined> => {
  const priceLists = (await pricingService.listPriceLists(
    { q: title },
    {
      relations: ["prices", "price_list_rules"],
      take: 100,
    },
  )) as PriceListWithPrices[]

  return priceLists.find((priceList) => priceList.title === title)
}

const buildRules = (
  entry: PriceListSyncEntry,
  customerGroups: Map<string, CustomerGroupDTO>,
  config: ResolvedSyncPriceListsStepConfig,
): Record<string, string[]> | undefined => {
  if (!hasText(entry.customerGroupName)) {
    return undefined
  }

  const customerGroup = customerGroups.get(entry.customerGroupName)
  if (!customerGroup) {
    return undefined
  }

  return {
    [config.customerGroupRuleAttribute]: [customerGroup.id],
  }
}

const ensurePriceList = async (params: {
  config: ResolvedSyncPriceListsStepConfig
  container: PriceListWorkflowContainer
  customerGroups: Map<string, CustomerGroupDTO>
  entry: PriceListSyncEntry
  pricingService: IPricingModuleService
  result: Map<string, PriceListWithPrices>
}): Promise<void> => {
  const { config, container, customerGroups, entry, pricingService, result } =
    params
  const rules = buildRules(entry, customerGroups, config)
  const existing = await findPriceListByTitle(pricingService, entry.title)
  const data = {
    description: entry.description,
    ends_at: entry.endsAt ?? null,
    metadata: entry.metadata,
    starts_at: entry.startsAt ?? null,
    status: "active" as const,
    title: entry.title,
    type: entry.type,
    ...(rules ? { rules } : {}),
  }

  if (existing) {
    await updatePriceListsWorkflow(container).run({
      input: {
        price_lists_data: [
          {
            id: existing.id,
            ...data,
          },
        ],
      },
    })
    result.set(entry.title, existing)
    return
  }

  const { result: created } = await createPriceListsWorkflow(container).run({
    input: {
      price_lists_data: [
        {
          ...data,
          prices: [],
        },
      ],
    },
  })
  if (created[0]) {
    result.set(entry.title, created[0])
  }
}

const runEnsurePriceLists = async (params: {
  config: ResolvedSyncPriceListsStepConfig
  container: PriceListWorkflowContainer
  customerGroups: Map<string, CustomerGroupDTO>
  entries: PriceListSyncEntry[]
  offset?: number
  pricingService: IPricingModuleService
  result: Map<string, PriceListWithPrices>
}): Promise<void> => {
  const offset = params.offset ?? 0
  const entry = params.entries[offset]
  if (entry === undefined) {
    return
  }

  await ensurePriceList({
    config: params.config,
    container: params.container,
    customerGroups: params.customerGroups,
    entry,
    pricingService: params.pricingService,
    result: params.result,
  })
  await runEnsurePriceLists({ ...params, offset: offset + 1 })
}

const ensurePriceLists = async ({
  config,
  container,
  customerGroups,
  entries,
  pricingService,
}: {
  entries: PriceListSyncEntry[]
  pricingService: IPricingModuleService
  customerGroups: Map<string, CustomerGroupDTO>
  container: PriceListWorkflowContainer
  config: ResolvedSyncPriceListsStepConfig
}): Promise<Map<string, PriceListWithPrices>> => {
  const result = new Map<string, PriceListWithPrices>()

  await runEnsurePriceLists({
    config,
    container,
    customerGroups,
    entries,
    pricingService,
    result,
  })

  return result
}

const hasNoQuantityBounds = (price: PriceDTO): boolean =>
  (price.min_quantity === null || price.min_quantity === undefined) &&
  (price.max_quantity === null || price.max_quantity === undefined)

const existingPriceForVariant = (
  priceList: PriceListWithPrices,
  variantId: string,
  currencyCode: string,
  variantPriceSetMap: Map<string, string>,
): PriceDTO | undefined => {
  const priceSetId = variantPriceSetMap.get(variantId)

  return priceList.prices?.find(
    (price) =>
      price.price_set_id === priceSetId &&
      price.currency_code?.toLowerCase() === currencyCode &&
      hasNoQuantityBounds(price),
  )
}

const buildPriceListPriceChanges = ({
  entry,
  logger,
  priceList,
  variantLookup,
  variantPriceSetMap,
}: {
  entry: PriceListSyncEntry
  logger: Logger
  priceList: PriceListWithPrices
  variantLookup: Map<string, VariantLookup>
  variantPriceSetMap: Map<string, string>
}): PriceListPriceChanges => {
  const create: PriceListPriceCreatePayload[] = []
  const update: PriceListPriceUpdatePayload[] = []
  let skipped = 0

  for (const price of entry.prices) {
    const variant = variantLookup.get(
      `${price.productHandle}:${price.variantSku}`,
    )
    if (!variant) {
      skipped += 1
      logger.warn(
        `Skipping price-list price for missing variant SKU "${price.variantSku}" on product "${price.productHandle}"`,
      )
      continue
    }

    const currencyCode = normalizeCurrencyCode(price.currencyCode)
    const existingPrice = existingPriceForVariant(
      priceList,
      variant.id,
      currencyCode,
      variantPriceSetMap,
    )

    if (existingPrice) {
      if (
        !amountsEqual(existingPrice.amount, price.amount) ||
        existingPrice.currency_code?.toLowerCase() !== currencyCode
      ) {
        update.push({
          amount: price.amount,
          currency_code: currencyCode,
          id: existingPrice.id,
          variant_id: variant.id,
        })
      }
    } else {
      create.push({
        amount: price.amount,
        currency_code: currencyCode,
        variant_id: variant.id,
      })
    }
  }

  return { create, skipped, update }
}

const syncEntryPrices = async (params: {
  container: PriceListPricesWorkflowContainer
  entry: PriceListSyncEntry
  logger: Logger
  priceListsByTitle: Map<string, PriceListWithPrices>
  variantLookup: Map<string, VariantLookup>
  variantPriceSetMap: Map<string, string>
}): Promise<PriceSyncTotals> => {
  const {
    container,
    entry,
    logger,
    priceListsByTitle,
    variantLookup,
    variantPriceSetMap,
  } = params
  const priceList = priceListsByTitle.get(entry.title)
  if (!priceList) {
    logger.warn(`Skipping prices for missing price list "${entry.title}"`)
    return { created: 0, skipped: 0, updated: 0 }
  }

  const changes = buildPriceListPriceChanges({
    entry,
    logger,
    priceList,
    variantLookup,
    variantPriceSetMap,
  })

  if (changes.create.length === 0 && changes.update.length === 0) {
    return { created: 0, skipped: changes.skipped, updated: 0 }
  }

  const { result } = await batchPriceListPricesWorkflow(container).run({
    input: {
      data: {
        create: changes.create,
        delete: [],
        id: priceList.id,
        update: changes.update,
      },
    },
  })

  return {
    created: result.created.length,
    skipped: changes.skipped,
    updated: result.updated.length,
  }
}

const runSyncPriceListPrices = async (params: {
  container: PriceListPricesWorkflowContainer
  entries: PriceListSyncEntry[]
  logger: Logger
  offset?: number
  priceListsByTitle: Map<string, PriceListWithPrices>
  totals: PriceSyncTotals
  variantLookup: Map<string, VariantLookup>
  variantPriceSetMap: Map<string, string>
}): Promise<PriceSyncTotals> => {
  const offset = params.offset ?? 0
  const entry = params.entries[offset]
  if (entry === undefined) {
    return params.totals
  }

  const entryTotals = await syncEntryPrices({
    container: params.container,
    entry,
    logger: params.logger,
    priceListsByTitle: params.priceListsByTitle,
    variantLookup: params.variantLookup,
    variantPriceSetMap: params.variantPriceSetMap,
  })

  return await runSyncPriceListPrices({
    ...params,
    offset: offset + 1,
    totals: {
      created: params.totals.created + entryTotals.created,
      skipped: params.totals.skipped + entryTotals.skipped,
      updated: params.totals.updated + entryTotals.updated,
    },
  })
}

const syncPriceListPrices = async ({
  container,
  entries,
  logger,
  priceListsByTitle,
  variantLookup,
  variantPriceSetMap,
}: {
  entries: PriceListSyncEntry[]
  priceListsByTitle: Map<string, PriceListWithPrices>
  variantLookup: Map<string, VariantLookup>
  variantPriceSetMap: Map<string, string>
  container: PriceListPricesWorkflowContainer
  logger: Logger
}): Promise<PriceSyncTotals> =>
  await runSyncPriceListPrices({
    container,
    entries,
    logger,
    priceListsByTitle,
    totals: { created: 0, skipped: 0, updated: 0 },
    variantLookup,
    variantPriceSetMap,
  })

export const syncPriceListsStep = createStep(
  SyncPriceListsStepId,
  async (input: SyncPriceListsStepInput, { container }) => {
    const config = resolveSyncPriceListsConfig(input.config)
    const entries = buildPriceListEntries(input.priceLists, config)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

    if (!entries.length) {
      return new StepResponse({
        priceLists: 0,
        pricesCreated: 0,
        pricesUpdated: 0,
      })
    }

    const productService = container.resolve<IProductModuleService>(
      Modules.PRODUCT,
    )
    const pricingService = container.resolve<IPricingModuleService>(
      Modules.PRICING,
    )
    const customerService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER,
    )
    const remoteQuery = container.resolve<RemoteQueryFunction>(
      ContainerRegistrationKeys.REMOTE_QUERY,
    )

    const products = await productService.listProducts(
      { id: { $in: input.productIds } },
      {
        relations: ["variants"],
        select: ["id", "handle", "variants.id", "variants.sku"],
      },
    )
    const variantLookup = buildVariantLookup(products)
    const customerGroups = await ensureCustomerGroups(
      entries,
      customerService,
      container,
      config,
    )
    const priceListsByTitle = await ensurePriceLists({
      config,
      container,
      customerGroups,
      entries,
      pricingService,
    })
    const variantIds = [
      ...new Set(
        entries.flatMap((entry) =>
          entry.prices
            .map((price) =>
              variantLookup.get(`${price.productHandle}:${price.variantSku}`),
            )
            .filter((variant): variant is VariantLookup => !!variant)
            .map((variant) => variant.id),
        ),
      ),
    ]
    const variantPriceSetLinks = variantIds.length
      ? toVariantPriceSetLinks(
          await remoteQuery({
            entryPoint: "product_variant_price_set",
            fields: ["variant_id", "price_set_id"],
            variables: { variant_id: variantIds },
          }),
        )
      : []
    const variantPriceSetMap = new Map(
      variantPriceSetLinks.map((link) => [link.variant_id, link.price_set_id]),
    )
    const priceSyncResult = await syncPriceListPrices({
      container,
      entries,
      logger,
      priceListsByTitle,
      variantLookup,
      variantPriceSetMap,
    })

    logger.info(
      `Synced ${priceListsByTitle.size} ${config.logLabel}, created ${priceSyncResult.created} prices, updated ${priceSyncResult.updated} prices`,
    )

    return new StepResponse({
      priceLists: priceListsByTitle.size,
      pricesCreated: priceSyncResult.created,
      pricesSkipped: priceSyncResult.skipped,
      pricesUpdated: priceSyncResult.updated,
    })
  },
)

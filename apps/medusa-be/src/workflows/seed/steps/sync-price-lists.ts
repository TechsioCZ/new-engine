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
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  batchPriceListPricesWorkflow,
  createCustomerGroupsWorkflow,
  createPriceListsWorkflow,
  updateCustomerGroupsWorkflow,
  updatePriceListsWorkflow,
} from "@medusajs/medusa/core-flows"

type PriceListPriceInput = {
  productHandle: string
  variantSku: string
  amount: number
  currencyCode: string
}

type OverridePriceListInput = {
  title: string
  customerGroupName: string
  prices: PriceListPriceInput[]
}

type SalePriceListInput = {
  title: string
  sourceTitle: string
  customerGroupName?: string
  startsAt?: string
  endsAt?: string
  prices: PriceListPriceInput[]
}

export type SyncPriceListsStepConfig = {
  metadataSource?: string
  logLabel?: string
  customerGroupRuleAttribute?: string
  descriptions?: {
    override?: string
    sale?: string
  }
  sourceTypes?: {
    override?: string
    sale?: string
    customerGroup?: string
  }
  metadataKeys?: {
    priceListTitle?: string
    startsAt?: string
    endsAt?: string
  }
}

type ResolvedSyncPriceListsStepConfig = {
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

export type SyncPriceListsStepInput = {
  productIds: string[]
  priceLists?: {
    overrides: OverridePriceListInput[]
    sales: SalePriceListInput[]
  }
  config?: SyncPriceListsStepConfig
}

type PriceListSyncEntry = {
  title: string
  description: string
  type: "override" | "sale"
  startsAt?: string
  endsAt?: string
  customerGroupName?: string
  prices: PriceListPriceInput[]
  metadata: Record<string, unknown>
}

type VariantLookup = {
  id: string
  sku: string
}

type VariantPriceSetLink = {
  variant_id: string
  price_set_id: string
}

type PriceListWithPrices = PriceListDTO & {
  prices?: PriceDTO[]
}

const SyncPriceListsStepId = "sync-price-lists-seed-step"
const DEFAULT_SYNC_PRICE_LISTS_CONFIG = {
  metadataSource: "seed-price-lists",
  logLabel: "price lists",
  customerGroupRuleAttribute: "customer.groups.id",
  descriptions: {
    override: "Seed price list: {title}",
    sale: "Seed sale prices for {sourceTitle}",
  },
  sourceTypes: {
    override: "price_list",
    sale: "sale",
    customerGroup: "price_list_customer_group",
  },
  metadataKeys: {
    priceListTitle: "source_price_list_title",
    startsAt: "starts_at",
    endsAt: "ends_at",
  },
} satisfies ResolvedSyncPriceListsStepConfig

function resolveSyncPriceListsConfig(
  config?: SyncPriceListsStepConfig
): ResolvedSyncPriceListsStepConfig {
  return {
    ...DEFAULT_SYNC_PRICE_LISTS_CONFIG,
    ...config,
    descriptions: {
      ...DEFAULT_SYNC_PRICE_LISTS_CONFIG.descriptions,
      ...config?.descriptions,
    },
    sourceTypes: {
      ...DEFAULT_SYNC_PRICE_LISTS_CONFIG.sourceTypes,
      ...config?.sourceTypes,
    },
    metadataKeys: {
      ...DEFAULT_SYNC_PRICE_LISTS_CONFIG.metadataKeys,
      ...config?.metadataKeys,
    },
  }
}

function formatTemplate(
  template: string,
  values: Record<string, string | undefined>
): string {
  return template.replace(
    /\{([a-zA-Z0-9_]+)\}/g,
    (_match, key: string) => values[key] ?? ""
  )
}

function buildPriceListMetadata(
  config: ResolvedSyncPriceListsStepConfig,
  sourceType: string,
  priceListTitle: string,
  dates?: { startsAt?: string; endsAt?: string }
): Record<string, unknown> {
  return {
    source: config.metadataSource,
    source_type: sourceType,
    [config.metadataKeys.priceListTitle]: priceListTitle,
    ...(dates
      ? {
          [config.metadataKeys.startsAt]: dates.startsAt,
          [config.metadataKeys.endsAt]: dates.endsAt,
        }
      : {}),
  }
}

function normalizeCurrencyCode(value: string): string {
  return value.toLowerCase()
}

function amountsEqual(left: unknown, right: number): boolean {
  let parsed = Number.NaN

  if (typeof left === "number") {
    parsed = left
  } else if (typeof left === "string") {
    parsed = Number(left)
  } else if (
    left &&
    typeof left === "object" &&
    "value" in left &&
    (typeof left.value === "number" || typeof left.value === "string")
  ) {
    parsed = Number(left.value)
  }

  return Number.isFinite(parsed) && Math.abs(parsed - right) < 0.000_001
}

function buildPriceListEntries(
  priceLists?: SyncPriceListsStepInput["priceLists"],
  config: ResolvedSyncPriceListsStepConfig = resolveSyncPriceListsConfig()
): PriceListSyncEntry[] {
  if (!priceLists) {
    return []
  }

  return [
    ...priceLists.overrides.map((priceList) => ({
      title: priceList.title,
      description: formatTemplate(config.descriptions.override, {
        title: priceList.title,
        sourceTitle: priceList.title,
      }),
      type: "override" as const,
      customerGroupName: priceList.customerGroupName,
      prices: priceList.prices,
      metadata: buildPriceListMetadata(
        config,
        config.sourceTypes.override,
        priceList.title
      ),
    })),
    ...priceLists.sales.map((priceList) => ({
      title: priceList.title,
      description: formatTemplate(config.descriptions.sale, {
        title: priceList.title,
        sourceTitle: priceList.sourceTitle,
      }),
      type: "sale" as const,
      startsAt: priceList.startsAt,
      endsAt: priceList.endsAt,
      customerGroupName: priceList.customerGroupName,
      prices: priceList.prices,
      metadata: buildPriceListMetadata(
        config,
        config.sourceTypes.sale,
        priceList.sourceTitle,
        {
          startsAt: priceList.startsAt,
          endsAt: priceList.endsAt,
        }
      ),
    })),
  ]
}

function buildVariantLookup(
  products: ProductDTO[]
): Map<string, VariantLookup> {
  const variants = new Map<string, VariantLookup>()

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (!variant.sku) {
        continue
      }

      variants.set(`${product.handle}:${variant.sku}`, {
        id: variant.id,
        sku: variant.sku,
      })
    }
  }

  return variants
}

async function ensureCustomerGroups(
  entries: PriceListSyncEntry[],
  customerService: ICustomerModuleService,
  container: Parameters<typeof createCustomerGroupsWorkflow>[0],
  config: ResolvedSyncPriceListsStepConfig
): Promise<Map<string, CustomerGroupDTO>> {
  const names = [
    ...new Set(
      entries
        .map((entry) => entry.customerGroupName)
        .filter((name): name is string => !!name)
    ),
  ]
  const result = new Map<string, CustomerGroupDTO>()

  for (const name of names) {
    const existing = await customerService.listCustomerGroups(
      { name },
      { take: 1 }
    )
    const metadata = {
      source: config.metadataSource,
      source_type: config.sourceTypes.customerGroup,
      [config.metadataKeys.priceListTitle]: name,
    }

    if (existing[0]) {
      const { result: updated } = await updateCustomerGroupsWorkflow(
        container
      ).run({
        input: {
          selector: { id: existing[0].id },
          update: { metadata },
        },
      })
      result.set(name, updated[0] ?? existing[0])
      continue
    }

    const { result: created } = await createCustomerGroupsWorkflow(
      container
    ).run({
      input: {
        customersData: [
          {
            name,
            metadata,
          },
        ],
      },
    })
    if (created[0]) {
      result.set(name, created[0])
    }
  }

  return result
}

async function findPriceListByTitle(
  pricingService: IPricingModuleService,
  title: string
): Promise<PriceListWithPrices | undefined> {
  const priceLists = (await pricingService.listPriceLists(
    { q: title },
    {
      relations: ["prices", "price_list_rules"],
      take: 100,
    }
  )) as PriceListWithPrices[]

  return priceLists.find((priceList) => priceList.title === title)
}

function buildRules(
  entry: PriceListSyncEntry,
  customerGroups: Map<string, CustomerGroupDTO>,
  config: ResolvedSyncPriceListsStepConfig
): Record<string, string[]> | undefined {
  if (!entry.customerGroupName) {
    return
  }

  const customerGroup = customerGroups.get(entry.customerGroupName)
  if (!customerGroup) {
    return
  }

  return {
    [config.customerGroupRuleAttribute]: [customerGroup.id],
  }
}

async function ensurePriceLists({
  entries,
  pricingService,
  customerGroups,
  container,
  config,
}: {
  entries: PriceListSyncEntry[]
  pricingService: IPricingModuleService
  customerGroups: Map<string, CustomerGroupDTO>
  container: Parameters<typeof createPriceListsWorkflow>[0]
  config: ResolvedSyncPriceListsStepConfig
}): Promise<Map<string, PriceListWithPrices>> {
  const result = new Map<string, PriceListWithPrices>()

  for (const entry of entries) {
    const rules = buildRules(entry, customerGroups, config)
    const existing = await findPriceListByTitle(pricingService, entry.title)
    const data = {
      title: entry.title,
      description: entry.description,
      type: entry.type,
      status: "active" as const,
      starts_at: entry.startsAt ?? null,
      ends_at: entry.endsAt ?? null,
      rules,
      metadata: entry.metadata,
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
      continue
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
      result.set(entry.title, created[0] as PriceListWithPrices)
    }
  }

  return result
}

function existingPriceForVariant(
  priceList: PriceListWithPrices,
  variantId: string,
  currencyCode: string,
  variantPriceSetMap: Map<string, string>
): PriceDTO | undefined {
  const priceSetId = variantPriceSetMap.get(variantId)

  return priceList.prices?.find(
    (price) =>
      price.price_set_id === priceSetId &&
      price.currency_code?.toLowerCase() === currencyCode &&
      (price.min_quantity === null || price.min_quantity === undefined) &&
      (price.max_quantity === null || price.max_quantity === undefined)
  )
}

async function syncPriceListPrices({
  entries,
  priceListsByTitle,
  variantLookup,
  variantPriceSetMap,
  container,
  logger,
}: {
  entries: PriceListSyncEntry[]
  priceListsByTitle: Map<string, PriceListWithPrices>
  variantLookup: Map<string, VariantLookup>
  variantPriceSetMap: Map<string, string>
  container: Parameters<typeof batchPriceListPricesWorkflow>[0]
  logger: Logger
}): Promise<{ created: number; updated: number; skipped: number }> {
  let created = 0
  let updated = 0
  let skipped = 0

  for (const entry of entries) {
    const priceList = priceListsByTitle.get(entry.title)
    if (!priceList) {
      logger.warn(`Skipping prices for missing price list "${entry.title}"`)
      continue
    }

    const changes = buildPriceListPriceChanges({
      entry,
      logger,
      priceList,
      variantLookup,
      variantPriceSetMap,
    })
    skipped += changes.skipped

    if (changes.create.length === 0 && changes.update.length === 0) {
      continue
    }

    const { result } = await batchPriceListPricesWorkflow(container).run({
      input: {
        data: {
          id: priceList.id,
          create: changes.create,
          update: changes.update,
          delete: [],
        },
      },
    })
    created += result.created.length
    updated += result.updated.length
  }

  return { created, updated, skipped }
}

function buildPriceListPriceChanges({
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
}): {
  create: Array<{ amount: number; currency_code: string; variant_id: string }>
  update: Array<{
    id: string
    amount: number
    currency_code: string
    variant_id: string
  }>
  skipped: number
} {
  const create: Array<{
    amount: number
    currency_code: string
    variant_id: string
  }> = []
  const update: Array<{
    id: string
    amount: number
    currency_code: string
    variant_id: string
  }> = []
  let skipped = 0

  for (const price of entry.prices) {
    const variant = variantLookup.get(
      `${price.productHandle}:${price.variantSku}`
    )
    if (!variant) {
      skipped += 1
      logger.warn(
        `Skipping price-list price for missing variant SKU "${price.variantSku}" on product "${price.productHandle}"`
      )
      continue
    }

    const currencyCode = normalizeCurrencyCode(price.currencyCode)
    const existingPrice = existingPriceForVariant(
      priceList,
      variant.id,
      currencyCode,
      variantPriceSetMap
    )

    if (!existingPrice) {
      create.push({
        amount: price.amount,
        currency_code: currencyCode,
        variant_id: variant.id,
      })
      continue
    }

    if (
      !amountsEqual(existingPrice.amount, price.amount) ||
      existingPrice.currency_code?.toLowerCase() !== currencyCode
    ) {
      update.push({
        id: existingPrice.id,
        amount: price.amount,
        currency_code: currencyCode,
        variant_id: variant.id,
      })
    }
  }

  return { create, update, skipped }
}

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
      Modules.PRODUCT
    )
    const pricingService = container.resolve<IPricingModuleService>(
      Modules.PRICING
    )
    const customerService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )
    const remoteQuery = container.resolve<RemoteQueryFunction>(
      ContainerRegistrationKeys.REMOTE_QUERY
    )

    const products = await productService.listProducts(
      { id: { $in: input.productIds } },
      {
        select: ["id", "handle", "variants.id", "variants.sku"],
        relations: ["variants"],
      }
    )
    const variantLookup = buildVariantLookup(products)
    const customerGroups = await ensureCustomerGroups(
      entries,
      customerService,
      container,
      config
    )
    const priceListsByTitle = await ensurePriceLists({
      entries,
      pricingService,
      customerGroups,
      container,
      config,
    })
    const variantIds = [
      ...new Set(
        entries.flatMap((entry) =>
          entry.prices
            .map((price) =>
              variantLookup.get(`${price.productHandle}:${price.variantSku}`)
            )
            .filter((variant): variant is VariantLookup => !!variant)
            .map((variant) => variant.id)
        )
      ),
    ]
    const variantPriceSetLinks = variantIds.length
      ? ((await remoteQuery({
          entryPoint: "product_variant_price_set",
          fields: ["variant_id", "price_set_id"],
          variables: { variant_id: variantIds },
        })) as VariantPriceSetLink[])
      : []
    const variantPriceSetMap = new Map(
      variantPriceSetLinks.map((link) => [link.variant_id, link.price_set_id])
    )
    const priceSyncResult = await syncPriceListPrices({
      entries,
      priceListsByTitle,
      variantLookup,
      variantPriceSetMap,
      container,
      logger,
    })

    logger.info(
      `Synced ${priceListsByTitle.size} ${config.logLabel}, created ${priceSyncResult.created} prices, updated ${priceSyncResult.updated} prices`
    )

    return new StepResponse({
      priceLists: priceListsByTitle.size,
      pricesCreated: priceSyncResult.created,
      pricesUpdated: priceSyncResult.updated,
      pricesSkipped: priceSyncResult.skipped,
    })
  }
)

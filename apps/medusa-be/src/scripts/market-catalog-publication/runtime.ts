import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type { Context, ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../modules/storefront-url-assignment"
import { enqueueCatalogAssignmentLifecycle } from "../../modules/storefront-url-assignment/catalog-lifecycle"
import type { StorefrontUrlAssignmentRecord } from "../../modules/storefront-url-assignment/models/storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "../../modules/storefront-url-assignment/service"
import { URL_REGISTRY_OUTBOX_MODULE } from "../../modules/url-registry-outbox"
import {
  PRODUCT_PUBLICATION_METADATA_KEY,
  parseProductPublicationSnapshot,
} from "../../modules/url-registry-outbox/product-publication-assignment"
import type UrlRegistryOutboxModuleService from "../../modules/url-registry-outbox/service"
import { hashCatalogTranslationValue } from "../catalog-translation-pipeline/canonical"
import { buildCatalogTranslationPlan } from "../catalog-translation-pipeline/planner"
import { inspectCatalogTranslationSnapshot } from "../catalog-translation-pipeline/runtime"
import type { CatalogTranslationInput } from "../catalog-translation-pipeline/types"
import type {
  MarketCatalogAssignmentSnapshot,
  MarketCatalogEntityPlanItem,
  MarketCatalogProductPlanItem,
  MarketCatalogPublicationManifest,
  MarketCatalogPublicationPlan,
  MarketCatalogPublicationSnapshot,
} from "./types"

type QueryService = Readonly<{
  graph: <Value>(input: {
    entity: string
    fields: readonly string[]
    filters?: Readonly<Record<string, unknown>>
    pagination?: Readonly<{ skip?: number; take: number }>
  }) => Promise<{ data?: Value[] }>
}>

type RawProduct = Readonly<{
  id?: unknown
  metadata?: null | Record<string, unknown>
  sales_channels?: readonly Readonly<{ id?: unknown }>[]
  updated_at?: unknown
}>

const PAGE_SIZE = 500

const text = (value: unknown, label: string) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is invalid`)
  }
  return value
}

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} is invalid`)
  }
  return value as Record<string, unknown>
}

const chunks = <Value>(values: readonly Value[], size: number) => {
  const result: Value[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

const readProducts = async (
  query: QueryService,
  productIds: readonly string[]
) => {
  const products: RawProduct[] = []
  for (const ids of chunks(productIds, PAGE_SIZE)) {
    const { data = [] } = await query.graph<RawProduct>({
      entity: "product",
      fields: ["id", "metadata", "sales_channels.id", "updated_at"],
      filters: { id: ids },
      pagination: { take: ids.length + 1 },
    })
    products.push(...data)
  }
  return products
}

const assignmentSnapshot = (
  record: StorefrontUrlAssignmentRecord
): MarketCatalogAssignmentSnapshot => {
  const sourceVersion = Number(record.source_version)
  if (!Number.isSafeInteger(sourceVersion) || sourceVersion < 1) {
    throw new Error("catalog URL assignment source version is invalid")
  }
  if (record.entity_kind !== "brand" && record.entity_kind !== "category") {
    throw new Error("catalog URL assignment entity kind is invalid")
  }
  if (record.market_code !== "cz" && record.market_code !== "hu") {
    throw new Error("catalog URL assignment market is invalid")
  }
  if (
    record.publication_status !== "draft" &&
    record.publication_status !== "published"
  ) {
    throw new Error("catalog URL assignment publication status is invalid")
  }
  return {
    entityId: text(record.entity_id, "assignment.entity_id"),
    entityKind: record.entity_kind,
    id: text(record.id, "assignment.id"),
    marketCode: record.market_code,
    publicationStatus: record.publication_status,
    publicSlug: text(record.public_slug, "assignment.public_slug"),
    salesChannelId: text(
      record.sales_channel_id,
      "assignment.sales_channel_id"
    ),
    sourceVersion,
  }
}

const readAssignments = async (
  service: StorefrontUrlAssignmentModuleService,
  manifest: MarketCatalogPublicationManifest
) => {
  const assignments: MarketCatalogAssignmentSnapshot[] = []
  for (const entityKind of ["brand", "category"] as const) {
    for (let skip = 0; ; skip += PAGE_SIZE) {
      const page = await service.listStorefrontUrlAssignments(
        { entity_kind: entityKind, market_code: manifest.market },
        { skip, take: PAGE_SIZE }
      )
      assignments.push(...page.map(assignmentSnapshot))
      if (page.length < PAGE_SIZE) {
        break
      }
    }
  }
  return assignments
}

export const inspectMarketCatalogPublication = async (
  container: ExecArgs["container"],
  manifest: MarketCatalogPublicationManifest,
  translationInput: CatalogTranslationInput,
  translationInputSha256: string
): Promise<MarketCatalogPublicationSnapshot> => {
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const assignmentService =
    container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
  const productIds = manifest.products.map(({ id }) => id)
  const [rawProducts, assignments, channelResult, translationSnapshot] =
    await Promise.all([
      readProducts(query, productIds),
      readAssignments(assignmentService, manifest),
      query.graph<{
        id?: unknown
        metadata?: null | Record<string, unknown>
      }>({
        entity: "sales_channel",
        fields: ["id", "metadata"],
        filters: { id: manifest.salesChannelId },
        pagination: { take: 2 },
      }),
      inspectCatalogTranslationSnapshot(container, translationInput),
    ])
  const channels = channelResult.data ?? []
  if (channels.length !== 1) {
    throw new Error("publication sales channel is missing or ambiguous")
  }
  const products = rawProducts.map((product, index) => {
    const parsed = parseProductPublicationSnapshot(product)
    return {
      ...parsed,
      salesChannelIds: (product.sales_channels ?? []).map(
        (channel, channelIndex) =>
          text(
            channel.id,
            `product ${index}.sales_channels[${channelIndex}].id`
          )
      ),
    }
  })
  const marketChannel = channels[0]
  return {
    assignments,
    products,
    salesChannel: {
      id: text(marketChannel?.id, "sales_channel.id"),
      metadata: marketChannel?.metadata ?? null,
    },
    translationPlan: buildCatalogTranslationPlan(
      translationInput,
      translationInputSha256,
      translationSnapshot
    ),
  }
}

const assignmentMatches = (
  record: StorefrontUrlAssignmentRecord,
  previous: MarketCatalogAssignmentSnapshot
) =>
  hashCatalogTranslationValue(assignmentSnapshot(record)) ===
  hashCatalogTranslationValue(previous)

const applyEntityItem = async (
  assignmentService: StorefrontUrlAssignmentModuleService,
  outboxService: UrlRegistryOutboxModuleService,
  market: MarketCatalogPublicationManifest["market"],
  item: MarketCatalogEntityPlanItem
) => {
  if (item.action === "unchanged") {
    return
  }
  await assignmentService.runInTransaction(async (sharedContext) => {
    await assignmentService.lockCatalogEntityAssignments(
      item.entityKind,
      item.entityId,
      sharedContext
    )
    const [identityRows, slugRows] = await Promise.all([
      assignmentService.listStorefrontUrlAssignments(
        {
          entity_id: item.entityId,
          entity_kind: item.entityKind,
          market_code: market,
        },
        { take: 2 },
        sharedContext
      ),
      assignmentService.listStorefrontUrlAssignments(
        {
          entity_kind: item.entityKind,
          market_code: market,
          public_slug: item.desiredAssignment.publicSlug,
        },
        { take: 2 },
        sharedContext
      ),
    ])
    if (identityRows.length > 1 || slugRows.length > 1) {
      throw new Error(
        `${item.entityKind} ${item.entityId} URL assignment state is invalid`
      )
    }
    const existing = identityRows[0]
    if (
      (item.previousAssignment === null && existing !== undefined) ||
      (item.previousAssignment !== null &&
        !(existing && assignmentMatches(existing, item.previousAssignment)))
    ) {
      throw new Error(
        `${item.entityKind} ${item.entityId} URL assignment changed after preflight`
      )
    }
    if (slugRows.some((candidate) => candidate.id !== existing?.id)) {
      throw new Error(
        `${item.entityKind} ${item.entityId} publicSlug appeared after preflight`
      )
    }
    const input = {
      publication_status: item.desiredAssignment.publicationStatus,
      public_slug: item.desiredAssignment.publicSlug,
      sales_channel_id: item.desiredAssignment.salesChannelId,
      source_version: item.nextSourceVersion,
    }
    const persisted = existing
      ? await assignmentService.updateStorefrontUrlAssignments(
          { id: existing.id, ...input },
          sharedContext
        )
      : await assignmentService.createStorefrontUrlAssignments(
          {
            entity_id: item.entityId,
            entity_kind: item.entityKind,
            market_code: market,
            schema_version: 1,
            ...input,
          },
          sharedContext
        )
    if (Number(persisted.source_version) !== item.nextSourceVersion) {
      throw new Error(
        `${item.entityKind} ${item.entityId} source version drifted`
      )
    }
    await enqueueCatalogAssignmentLifecycle(
      outboxService,
      persisted,
      sharedContext as Context<SqlEntityManager>
    )
  })
}

const publicationMetadata = (
  metadata: Readonly<Record<string, unknown>>,
  market: MarketCatalogPublicationManifest["market"],
  assignment: MarketCatalogProductPlanItem["desiredAssignment"]
) => {
  const current = metadata[PRODUCT_PUBLICATION_METADATA_KEY]
  const contract = current
    ? asRecord(current, PRODUCT_PUBLICATION_METADATA_KEY)
    : { markets: {}, schemaVersion: 1 }
  const markets = asRecord(
    contract.markets,
    `${PRODUCT_PUBLICATION_METADATA_KEY}.markets`
  )
  return {
    ...metadata,
    [PRODUCT_PUBLICATION_METADATA_KEY]: {
      markets: { ...markets, [market]: assignment },
      schemaVersion: 1,
    },
  }
}

const applyProductItems = async (
  container: ExecArgs["container"],
  plan: MarketCatalogPublicationPlan
) => {
  const items = plan.items.products.filter(({ action }) => action === "update")
  if (items.length === 0) {
    return
  }
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const rawProducts = await readProducts(
    query,
    items.map(({ productId }) => productId)
  )
  const productsById = new Map(
    rawProducts.map((product) => [text(product.id, "product.id"), product])
  )
  const products = items.map((item) => {
    const product = productsById.get(item.productId)
    if (!product) {
      throw new Error(`product ${item.productId} disappeared during apply`)
    }
    const parsed = parseProductPublicationSnapshot(product)
    if (
      parsed.sourceVersion !== item.sourceVersion ||
      hashCatalogTranslationValue(parsed.assignments[plan.market]) !==
        hashCatalogTranslationValue(item.previousAssignment)
    ) {
      throw new Error(
        `product ${item.productId} publication changed after preflight`
      )
    }
    return {
      id: item.productId,
      metadata: publicationMetadata(
        product.metadata ?? {},
        plan.market,
        item.desiredAssignment
      ),
    }
  })
  await updateProductsWorkflow(container).run({ input: { products } })
}

export const applyMarketCatalogPublication = async (
  container: ExecArgs["container"],
  plan: MarketCatalogPublicationPlan
) => {
  const assignmentService =
    container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
  const outboxService = container.resolve<UrlRegistryOutboxModuleService>(
    URL_REGISTRY_OUTBOX_MODULE
  )
  for (const item of [...plan.items.categories, ...plan.items.brands]) {
    await applyEntityItem(assignmentService, outboxService, plan.market, item)
  }
  await applyProductItems(container, plan)
  return {
    completedBrands: plan.items.brands.filter(
      ({ action }) => action !== "unchanged"
    ).length,
    completedCategories: plan.items.categories.filter(
      ({ action }) => action !== "unchanged"
    ).length,
    completedProducts: plan.items.products.filter(
      ({ action }) => action !== "unchanged"
    ).length,
  }
}

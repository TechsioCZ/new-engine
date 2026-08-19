import { createHash } from "node:crypto"
import type { IEventBusModuleService, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  type StepExecutionContext,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  type ProductPublicationSnapshot,
  type ProductPublicationSnapshotOptions,
  parseProductPublicationSnapshot,
} from "../../modules/url-registry-outbox/product-publication-assignment"
import {
  type ProductLifecycleReason,
  URL_REGISTRY_OUTBOX_MARKETS,
  type UrlRegistryOutboxMarket,
} from "../../modules/url-registry-outbox/types"
import { readExactCatalogTranslations } from "../../utils/catalog-translation"

const CANONICAL_ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
const MAX_IDENTIFIER_LENGTH = 255
const PRINTABLE_ASCII = /^[\x21-\x7e]+$/

export const URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT =
  "url-registry.product-lifecycle.requested"

export const PRODUCT_LIFECYCLE_RETRY_OPTIONS = Object.freeze({
  attempts: 5,
  backoff: Object.freeze({
    delay: 1000,
    type: "exponential",
  }),
})

export type ProductLifecycleOutboxInput = Readonly<{
  affectedMarketCodes: readonly UrlRegistryOutboxMarket[]
  eventId: string
  marketAssignments: readonly Readonly<{
    assignment: ProductPublicationSnapshot["assignments"][UrlRegistryOutboxMarket]
    marketCode: UrlRegistryOutboxMarket
    sourceVersion: string
  }>[]
  occurredAt: string
  productId: string
  reason: ProductLifecycleReason
}>

type ProductLifecycleEmissionInput = Readonly<{
  productIds: readonly string[]
  reason: ProductLifecycleReason
}>

type ProductLifecycleBuildInput = ProductLifecycleEmissionInput &
  Readonly<{
    eventGroupId: unknown
    productSnapshots?: readonly ProductPublicationSnapshot[]
  }>

export type ProductLifecycleEmissionCompensation = Readonly<{
  eventGroupId: string
  eventName: typeof URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT
}>

type ProductLifecycleWorkflowContext = Pick<
  StepExecutionContext,
  "container" | "eventGroupId"
>

export class ProductLifecycleProducerInputError extends MedusaError {
  constructor(message: string) {
    super(MedusaError.Types.INVALID_DATA, message)
    this.name = "ProductLifecycleProducerInputError"
  }
}

const identifier = (value: unknown, label: string) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_IDENTIFIER_LENGTH ||
    !PRINTABLE_ASCII.test(value)
  ) {
    throw new ProductLifecycleProducerInputError(`${label} is invalid`)
  }
  return value
}

const workflowOccurrenceTime = (eventGroupId: unknown) => {
  if (typeof eventGroupId !== "string" || !CANONICAL_ULID.test(eventGroupId)) {
    throw new ProductLifecycleProducerInputError(
      "workflow eventGroupId is invalid"
    )
  }

  let timestamp = 0
  for (const character of eventGroupId.slice(0, 10)) {
    timestamp = timestamp * 32 + CROCKFORD_BASE32.indexOf(character)
  }

  return {
    eventGroupId,
    occurredAt: new Date(timestamp).toISOString(),
  }
}

const lifecycleEventId = (
  eventGroupId: string,
  reason: ProductLifecycleReason,
  productId: string
) =>
  `sha256:${createHash("sha256")
    .update(JSON.stringify([eventGroupId, reason, productId]))
    .digest("hex")}`

export const buildProductLifecycleOutboxInputs = ({
  eventGroupId: rawEventGroupId,
  productIds,
  productSnapshots,
  reason,
}: ProductLifecycleBuildInput) => {
  const { eventGroupId, occurredAt } = workflowOccurrenceTime(rawEventGroupId)
  const uniqueProductIds = [
    ...new Set(productIds.map((id) => identifier(id, "productId"))),
  ].sort()

  const snapshotsByProductId = new Map(
    (productSnapshots ?? []).map((snapshot) => [snapshot.productId, snapshot])
  )
  if (
    reason !== "deleted" &&
    (snapshotsByProductId.size !== uniqueProductIds.length ||
      uniqueProductIds.some(
        (productId) => !snapshotsByProductId.has(productId)
      ))
  ) {
    throw new ProductLifecycleProducerInputError(
      "every live product requires one publication snapshot"
    )
  }

  return uniqueProductIds.map((productId): ProductLifecycleOutboxInput => {
    const snapshot = snapshotsByProductId.get(productId)
    return {
      affectedMarketCodes: [...URL_REGISTRY_OUTBOX_MARKETS],
      eventId: lifecycleEventId(eventGroupId, reason, productId),
      marketAssignments: URL_REGISTRY_OUTBOX_MARKETS.map((marketCode) => ({
        assignment:
          reason === "deleted"
            ? null
            : (snapshot?.assignments[marketCode] ?? null),
        marketCode,
        sourceVersion: snapshot?.sourceVersion ?? eventGroupId,
      })),
      occurredAt,
      productId,
      reason,
    }
  })
}

export const loadProductPublicationSnapshots = async (
  productIds: readonly string[],
  { container }: Pick<StepExecutionContext, "container">,
  options: ProductPublicationSnapshotOptions = {}
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "metadata", "updated_at", "sales_channels.id"],
    filters: { id: [...productIds] },
  })
  const snapshots = data.map((product) =>
    parseProductPublicationSnapshot(product, options)
  )
  const missingTranslationsByMarket = new Map<
    UrlRegistryOutboxMarket,
    ReadonlySet<string>
  >()
  for (const market of URL_REGISTRY_OUTBOX_MARKETS) {
    const publishedProductIds = snapshots.flatMap((snapshot) =>
      snapshot.assignments[market]?.publicationStatus === "published"
        ? [snapshot.productId]
        : []
    )
    const translations = await readExactCatalogTranslations({
      container,
      entityIds: publishedProductIds,
      entityKind: "product",
      market,
    })
    if (translations.kind === "unavailable") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Catalog Translation dependency is unavailable for market ${market}`
      )
    }
    if (translations.kind === "invalid-response") {
      throw new ProductLifecycleProducerInputError(
        `Catalog Translation state is invalid for market ${market}: ${translations.causeCode}`
      )
    }
    missingTranslationsByMarket.set(
      market,
      new Set(translations.missingEntityIds)
    )
  }

  return snapshots.map((snapshot) => ({
    ...snapshot,
    assignments: Object.fromEntries(
      URL_REGISTRY_OUTBOX_MARKETS.map((market) => [
        market,
        missingTranslationsByMarket.get(market)?.has(snapshot.productId)
          ? null
          : snapshot.assignments[market],
      ])
    ) as ProductPublicationSnapshot["assignments"],
  }))
}

export const emitProductLifecycleEvents = async (
  input: ProductLifecycleEmissionInput,
  { container, eventGroupId }: ProductLifecycleWorkflowContext
) => {
  if (input.productIds.length === 0) {
    return
  }
  const productSnapshots =
    input.reason === "deleted"
      ? undefined
      : await loadProductPublicationSnapshots(
          input.productIds,
          { container },
          input.reason === "channel-unlinked"
            ? { unlinkedSalesChannelPolicy: "unpublish" }
            : undefined
        )
  const events = buildProductLifecycleOutboxInputs({
    ...input,
    eventGroupId,
    productSnapshots,
  })
  const eventBus = container.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  await eventBus.emit(
    events.map((data) => ({
      data,
      metadata: { eventGroupId },
      name: URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT,
      options: PRODUCT_LIFECYCLE_RETRY_OPTIONS,
    }))
  )

  return new StepResponse<undefined, ProductLifecycleEmissionCompensation>(
    undefined,
    {
      eventGroupId: eventGroupId as string,
      eventName: URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT,
    }
  )
}

export const clearProductLifecycleEvents = async (
  compensation: ProductLifecycleEmissionCompensation | undefined,
  { container }: Pick<StepExecutionContext, "container">
) => {
  if (!compensation) {
    return
  }

  const eventBus = container.resolve<IEventBusModuleService>(Modules.EVENT_BUS)
  await eventBus.clearGroupedEvents(compensation.eventGroupId, {
    eventNames: [compensation.eventName],
  })
}

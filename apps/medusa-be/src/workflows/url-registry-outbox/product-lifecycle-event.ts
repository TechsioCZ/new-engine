import { createHash } from "node:crypto"
import type { IEventBusModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  type StepExecutionContext,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  type ProductLifecycleReason,
  URL_REGISTRY_OUTBOX_MARKETS,
  type UrlRegistryOutboxMarket,
} from "../../modules/url-registry-outbox/types"

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
  occurredAt: string
  productId: string
  reason: ProductLifecycleReason
}>

type ProductLifecycleEmissionInput = Readonly<{
  productIds: readonly string[]
  reason: ProductLifecycleReason
}>

export type ProductLifecycleEmissionCompensation = Readonly<{
  eventGroupId: string
  eventName: typeof URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT
}>

type ProductLifecycleWorkflowContext = Pick<
  StepExecutionContext,
  "container" | "eventGroupId"
>

export class ProductLifecycleProducerInputError extends Error {
  constructor(message: string) {
    super(message)
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
  reason,
}: ProductLifecycleEmissionInput & { eventGroupId: unknown }) => {
  const { eventGroupId, occurredAt } = workflowOccurrenceTime(rawEventGroupId)
  const uniqueProductIds = [
    ...new Set(productIds.map((id) => identifier(id, "productId"))),
  ].sort()

  return uniqueProductIds.map(
    (productId): ProductLifecycleOutboxInput => ({
      affectedMarketCodes: [...URL_REGISTRY_OUTBOX_MARKETS],
      eventId: lifecycleEventId(eventGroupId, reason, productId),
      occurredAt,
      productId,
      reason,
    })
  )
}

export const emitProductLifecycleEvents = async (
  input: ProductLifecycleEmissionInput,
  { container, eventGroupId }: ProductLifecycleWorkflowContext
) => {
  const events = buildProductLifecycleOutboxInputs({
    ...input,
    eventGroupId,
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

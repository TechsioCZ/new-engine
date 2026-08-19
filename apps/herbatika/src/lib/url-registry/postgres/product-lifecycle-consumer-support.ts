import { createHash } from "node:crypto"
import { createUrlRegistryCommand } from "../contracts"
import { UrlRegistryError } from "../errors"
import type { ProductLifecycleReceiptAction } from "../product-lifecycle"
import type {
  ProductLifecycleChangeType,
  ProductLifecycleDeliveryV1,
} from "../product-lifecycle-parser"
import { retireRoute } from "./lifecycle-writes"
import type { SqlClient } from "./sql"
import { asEntityResult, type PostgresCommandRunner } from "./write-runner"

export type ProductLifecycleReceipt = Readonly<{
  streamSequence: number
  sourceEventId: string
  envelopeFingerprint: `sha256:${string}`
  changeType: ProductLifecycleChangeType
  action: ProductLifecycleReceiptAction
  commandIdempotencyKey: string | null
}>

export type ProductLifecycleConsumerErrorCode =
  | "DELIVERY_DRIFT"
  | "SEQUENCE_GAP"
  | "STALE_DELIVERY"

export class ProductLifecycleConsumerError extends Error {
  readonly code: ProductLifecycleConsumerErrorCode
  readonly details: Readonly<Record<string, unknown>>
  constructor(
    code: ProductLifecycleConsumerErrorCode,
    message: string,
    details: Readonly<Record<string, unknown>> = {}
  ) {
    super(message)
    this.name = "ProductLifecycleConsumerError"
    this.code = code
    this.details = details
  }
}

export const isProductLifecycleConsumerError = (
  value: unknown
): value is ProductLifecycleConsumerError =>
  value instanceof ProductLifecycleConsumerError

export type ProductLifecycleStreamState = Readonly<{
  cursorLastSequence: number | null
  eventReceipt: ProductLifecycleReceipt | null
  sequenceReceipt: ProductLifecycleReceipt | null
}>

export type ProductLifecycleStreamPosition =
  | Readonly<{
      kind: "replay"
      action: ProductLifecycleReceiptAction
      commandIdempotencyKey: string | null
    }>
  | Readonly<{ kind: "next" }>

const isExactReceipt = (
  delivery: ProductLifecycleDeliveryV1,
  fingerprint: `sha256:${string}`,
  receipt: ProductLifecycleReceipt
): boolean =>
  receipt.streamSequence === delivery.streamSequence &&
  receipt.sourceEventId === delivery.outboxEventId &&
  receipt.envelopeFingerprint === fingerprint &&
  receipt.changeType === delivery.changeType

const orderingDetails = (
  delivery: ProductLifecycleDeliveryV1,
  cursorLastSequence: number | null
) => ({
  sourceId: delivery.entityId,
  market: delivery.marketCode,
  streamSequence: delivery.streamSequence,
  cursorLastSequence,
})

export const classifyProductLifecycleStream = (
  delivery: ProductLifecycleDeliveryV1,
  fingerprint: `sha256:${string}`,
  state: ProductLifecycleStreamState
): ProductLifecycleStreamPosition => {
  if (
    state.sequenceReceipt &&
    isExactReceipt(delivery, fingerprint, state.sequenceReceipt)
  ) {
    return {
      kind: "replay",
      action: state.sequenceReceipt.action,
      commandIdempotencyKey: state.sequenceReceipt.commandIdempotencyKey,
    }
  }
  if (
    state.sequenceReceipt ||
    state.eventReceipt ||
    state.cursorLastSequence === delivery.streamSequence
  ) {
    const stale =
      state.cursorLastSequence !== null &&
      delivery.streamSequence < state.cursorLastSequence
    throw new ProductLifecycleConsumerError(
      stale ? "STALE_DELIVERY" : "DELIVERY_DRIFT",
      stale
        ? "Product lifecycle delivery is behind the applied stream"
        : "Product lifecycle delivery conflicts with persisted stream identity",
      orderingDetails(delivery, state.cursorLastSequence)
    )
  }
  const expectedSequence = (state.cursorLastSequence ?? 0) + 1
  if (delivery.streamSequence !== expectedSequence) {
    const stale = delivery.streamSequence < expectedSequence
    throw new ProductLifecycleConsumerError(
      stale ? "STALE_DELIVERY" : "SEQUENCE_GAP",
      stale
        ? "Product lifecycle delivery is behind the applied stream"
        : "Product lifecycle delivery skipped a stream sequence",
      {
        ...orderingDetails(delivery, state.cursorLastSequence),
        expectedSequence,
      }
    )
  }
  return { kind: "next" }
}

const commandKey = (delivery: ProductLifecycleDeliveryV1): string =>
  `urlr:product-lifecycle:${createHash("sha256")
    .update(
      [delivery.source, delivery.outboxEventId, delivery.marketCode].join("\0")
    )
    .digest("hex")}`

export const retireProductLifecycleRoute = async (
  runner: PostgresCommandRunner,
  executor: SqlClient,
  delivery: ProductLifecycleDeliveryV1,
  route: Readonly<{ route: { id: string; version: number } }>
): Promise<string> => {
  const identity = {
    targetType: "entity" as const,
    sourceSystem: "medusa",
    sourceType: "product",
    sourceId: delivery.entityId,
    staticRouteKey: null,
  }
  const key = commandKey(delivery)
  const command = createUrlRegistryCommand({
    idempotencyKey: key,
    request: {
      commandType: "retire-route" as const,
      expectedVersion: route.route.version,
      source: {
        producer: "herbatika-product-lifecycle",
        sourceSystem: "medusa",
        sourceType: "product",
        sourceId: delivery.entityId,
        sourceVersion: String(delivery.streamSequence),
        sourceEventId: delivery.outboxEventId,
      },
      target: { routeId: route.route.id, identity },
    },
  })
  const result = asEntityResult(
    await runner.runInTransaction(executor, {
      command,
      expectedType: "retire-route",
      mutate: (client) => retireRoute(client, command),
    })
  )
  if (result.commit.outcome !== "applied") {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Product lifecycle retirement did not apply"
    )
  }
  return key
}

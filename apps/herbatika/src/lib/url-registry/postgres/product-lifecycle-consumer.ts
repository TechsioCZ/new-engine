import {
  CATALOG_LIFECYCLE_ENTITY_KINDS,
  type CatalogLifecycleDeliveryV1,
  parseCatalogLifecycleDeliveryV1,
} from "../catalog-lifecycle-parser"
import type { SourceReadResult } from "../contracts"
import {
  decideCatalogLifecycle,
  decideProductLifecycle,
  decideTranslationInvalidatedProductLifecycle,
  fingerprintProductLifecycleDelivery,
  type ProductLifecycleReceiptAction,
  type UrlRegistryLifecycleDeliveryV1,
} from "../product-lifecycle"
import {
  type ProductLifecycleDeliveryV1,
  parseProductLifecycleDeliveryV1,
} from "../product-lifecycle-parser"
import {
  changeProductLifecycleSlug,
  classifyProductLifecycleStream,
  isProductLifecycleConsumerError,
  ProductLifecycleConsumerError,
  publishProductLifecycleRoute,
  retireProductLifecycleRoute,
} from "./product-lifecycle-consumer-support"
import {
  appendProductLifecycleReceipt,
  readProductLifecycleRoute,
  readProductLifecycleStreamState,
} from "./product-lifecycle-store"
import { postgresErrorField, type SqlClient, type SqlPool } from "./sql"
import {
  executeRetriableTransaction,
  type TransactionRetryOptions,
} from "./transaction"
import { PostgresCommandRunner } from "./write-runner"

export type ProductLifecycleSourceReader = (input: {
  market: ProductLifecycleDeliveryV1["marketCode"]
  productId: string
}) => Promise<SourceReadResult<unknown>>

export type CatalogLifecycleSourceReader = (
  delivery: CatalogLifecycleDeliveryV1
) => Promise<SourceReadResult<unknown>>

export type ProductLifecycleConsumeResult =
  | Readonly<{
      kind: "acknowledged"
      action: ProductLifecycleReceiptAction
      replayed: boolean
      streamSequence: number
      commandIdempotencyKey: string | null
    }>
  | Extract<
      ReturnType<typeof decideProductLifecycle>,
      { kind: "retry" | "conflict" }
    >

export type PostgresProductLifecycleConsumerOptions = Readonly<{
  readCatalog?: CatalogLifecycleSourceReader
  readProduct: ProductLifecycleSourceReader
  transaction?: TransactionRetryOptions
}>

type ReadableProductSource = Extract<
  SourceReadResult<unknown>,
  { kind: "found" | "missing" }
>

const acknowledge = (
  delivery: UrlRegistryLifecycleDeliveryV1,
  action: ProductLifecycleReceiptAction,
  commandIdempotencyKey: string | null,
  replayed: boolean
): ProductLifecycleConsumeResult => ({
  kind: "acknowledged",
  action,
  replayed,
  streamSequence: delivery.streamSequence,
  commandIdempotencyKey,
})

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

const parseDelivery = (input: unknown): UrlRegistryLifecycleDeliveryV1 => {
  if (input && typeof input === "object") {
    const entityKind = (input as { entityKind?: unknown }).entityKind
    if (
      typeof entityKind === "string" &&
      CATALOG_LIFECYCLE_ENTITY_KINDS.includes(
        entityKind as CatalogLifecycleDeliveryV1["entityKind"]
      )
    ) {
      return parseCatalogLifecycleDeliveryV1(input)
    }
  }
  return parseProductLifecycleDeliveryV1(input)
}

export class PostgresProductLifecycleConsumer {
  private readonly commands: PostgresCommandRunner
  private readonly options: PostgresProductLifecycleConsumerOptions
  private readonly pool: SqlPool

  constructor(pool: SqlPool, options: PostgresProductLifecycleConsumerOptions) {
    this.pool = pool
    this.options = options
    this.commands = new PostgresCommandRunner(pool, options.transaction ?? {})
  }

  async consume(input: unknown): Promise<ProductLifecycleConsumeResult> {
    const delivery = parseDelivery(input)
    const fingerprint = fingerprintProductLifecycleDelivery(delivery)
    const replay = await this.readReplay(delivery, fingerprint)
    if (replay) {
      return replay
    }
    const requiresSourceRead =
      delivery.changeType === "delete" ||
      delivery.payload.assignment?.publicationStatus === "published"
    let source: SourceReadResult<unknown> = { kind: "missing" }
    if (requiresSourceRead) {
      if (delivery.entityKind === "product") {
        source = await this.options.readProduct({
          market: delivery.marketCode,
          productId: delivery.entityId,
        })
      } else if (this.options.readCatalog) {
        source = await this.options.readCatalog(delivery)
      } else {
        source = { kind: "unavailable" }
      }
    }
    if (source.kind === "unavailable" || source.kind === "invalid-response") {
      return {
        kind: "retry",
        action: null,
        cause: `source-${source.kind}`,
      }
    }
    return this.consumeOrdered(delivery, fingerprint, source)
  }

  private async readReplay(
    delivery: UrlRegistryLifecycleDeliveryV1,
    fingerprint: `sha256:${string}`
  ): Promise<ProductLifecycleConsumeResult | null> {
    const preflight = await readProductLifecycleStreamState(
      this.pool,
      delivery,
      false
    )
    if (preflight.sequenceReceipt || preflight.eventReceipt) {
      const position = classifyProductLifecycleStream(
        delivery,
        fingerprint,
        preflight
      )
      if (position.kind === "replay") {
        return acknowledge(
          delivery,
          position.action,
          position.commandIdempotencyKey,
          true
        )
      }
    }
    return null
  }

  private async consumeOrdered(
    delivery: UrlRegistryLifecycleDeliveryV1,
    fingerprint: `sha256:${string}`,
    source: ReadableProductSource
  ): Promise<ProductLifecycleConsumeResult> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await executeRetriableTransaction(
          this.pool,
          (executor) =>
            this.consumeInTransaction(executor, delivery, fingerprint, source),
          this.options.transaction
        )
      } catch (error) {
        if (
          isProductLifecycleConsumerError(error) &&
          error.code === "SEQUENCE_GAP" &&
          attempt < 3
        ) {
          await delay(attempt * 10)
          continue
        }
        if (
          postgresErrorField(error, "code") === "23505" &&
          postgresErrorField(error, "constraint")?.startsWith(
            "url_registry_source_event_receipt_"
          )
        ) {
          throw new ProductLifecycleConsumerError(
            "DELIVERY_DRIFT",
            "Product lifecycle delivery conflicts with a persisted event"
          )
        }
        throw error
      }
    }
    throw new Error("Product lifecycle ordering retry budget was exhausted")
  }

  private async consumeInTransaction(
    executor: SqlClient,
    delivery: UrlRegistryLifecycleDeliveryV1,
    fingerprint: `sha256:${string}`,
    source: ReadableProductSource
  ): Promise<ProductLifecycleConsumeResult> {
    const state = await readProductLifecycleStreamState(
      executor,
      delivery,
      true
    )
    const position = classifyProductLifecycleStream(
      delivery,
      fingerprint,
      state
    )
    if (position.kind === "replay") {
      return acknowledge(
        delivery,
        position.action,
        position.commandIdempotencyKey,
        true
      )
    }
    const route = await readProductLifecycleRoute(executor, delivery)
    const decision =
      delivery.entityKind === "product"
        ? (delivery.payload.reason === "translation-invalidated"
            ? decideTranslationInvalidatedProductLifecycle
            : decideProductLifecycle)(
            delivery.changeType,
            delivery.payload.assignment,
            source,
            route
          )
        : decideCatalogLifecycle(
            delivery.changeType,
            delivery.payload.assignment,
            source,
            route
          )
    if (decision.kind === "retry" || decision.kind === "conflict") {
      return decision
    }
    let commandIdempotencyKey: string | null = null
    if (decision.kind === "retire") {
      commandIdempotencyKey = await retireProductLifecycleRoute(
        this.commands,
        executor,
        delivery,
        decision.route
      )
    } else if (decision.kind === "publish") {
      commandIdempotencyKey = await publishProductLifecycleRoute(
        this.commands,
        executor,
        delivery,
        decision.publicSlug
      )
    } else if (decision.kind === "change-slug") {
      commandIdempotencyKey = await changeProductLifecycleSlug({
        delivery,
        executor,
        publicSlug: decision.publicSlug,
        route: decision.route,
        runner: this.commands,
      })
    }
    await appendProductLifecycleReceipt(executor, {
      delivery,
      fingerprint,
      action: decision.action,
      commandIdempotencyKey,
    })
    return acknowledge(delivery, decision.action, commandIdempotencyKey, false)
  }
}

export const createPostgresProductLifecycleConsumer = (
  pool: SqlPool,
  options: PostgresProductLifecycleConsumerOptions
) => new PostgresProductLifecycleConsumer(pool, options)

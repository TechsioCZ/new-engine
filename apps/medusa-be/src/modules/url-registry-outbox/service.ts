import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import {
  acknowledgeUrlRegistryOutboxEvent,
  claimUrlRegistryOutboxEvents,
  failUrlRegistryOutboxEvent,
  reclaimExpiredUrlRegistryOutboxEvents,
  retryUrlRegistryOutboxEvent,
} from "./delivery-state"
import {
  enqueueNormalizedCatalogLifecycleEvent,
  enqueueNormalizedProductLifecycleEvent,
  fingerprintCatalogLifecycleEvent,
  fingerprintProductLifecycleEvent,
} from "./enqueue"
import UrlRegistryOutboxEvent from "./models/url-registry-outbox-event"
import UrlRegistryOutboxStream from "./models/url-registry-outbox-stream"
import {
  normalizeCatalogLifecycleEventInput,
  normalizeProductLifecycleEventInput,
} from "./types"

const transactionManager = (sharedContext: Context<SqlEntityManager>) => {
  const manager = sharedContext.transactionManager
  if (!manager) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "URL registry outbox transaction manager is unavailable"
    )
  }
  return manager
}

class UrlRegistryOutboxModuleService extends MedusaService({
  UrlRegistryOutboxEvent,
  UrlRegistryOutboxStream,
}) {
  @InjectManager()
  async enqueueProductLifecycleEvent(
    input: unknown,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    const event = normalizeProductLifecycleEventInput(input)
    return await this.enqueueProductLifecycleEvent_(
      event,
      fingerprintProductLifecycleEvent(event),
      sharedContext
    )
  }

  @InjectTransactionManager()
  protected async enqueueProductLifecycleEvent_(
    event: ReturnType<typeof normalizeProductLifecycleEventInput>,
    fingerprint: ReturnType<typeof fingerprintProductLifecycleEvent>,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    return await enqueueNormalizedProductLifecycleEvent(
      transactionManager(sharedContext),
      event,
      fingerprint
    )
  }

  @InjectManager()
  async enqueueCatalogLifecycleEvent(
    input: unknown,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    const event = normalizeCatalogLifecycleEventInput(input)
    return await this.enqueueCatalogLifecycleEvent_(
      event,
      fingerprintCatalogLifecycleEvent(event),
      sharedContext
    )
  }

  @InjectTransactionManager()
  protected async enqueueCatalogLifecycleEvent_(
    event: ReturnType<typeof normalizeCatalogLifecycleEventInput>,
    fingerprint: ReturnType<typeof fingerprintCatalogLifecycleEvent>,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    return await enqueueNormalizedCatalogLifecycleEvent(
      transactionManager(sharedContext),
      event,
      fingerprint
    )
  }

  @InjectManager()
  async claimUrlRegistryOutboxEvents(
    input: unknown,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    return await this.claimUrlRegistryOutboxEvents_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async claimUrlRegistryOutboxEvents_(
    input: unknown,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    return await claimUrlRegistryOutboxEvents(
      transactionManager(sharedContext),
      input
    )
  }

  @InjectManager()
  async acknowledgeUrlRegistryOutboxEvent(
    input: unknown,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    return await this.acknowledgeUrlRegistryOutboxEvent_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async acknowledgeUrlRegistryOutboxEvent_(
    input: unknown,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    return await acknowledgeUrlRegistryOutboxEvent(
      transactionManager(sharedContext),
      input
    )
  }

  @InjectManager()
  async retryUrlRegistryOutboxEvent(
    input: unknown,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    return await this.retryUrlRegistryOutboxEvent_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async retryUrlRegistryOutboxEvent_(
    input: unknown,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    return await retryUrlRegistryOutboxEvent(
      transactionManager(sharedContext),
      input
    )
  }

  @InjectManager()
  async failUrlRegistryOutboxEvent(
    input: unknown,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    return await this.failUrlRegistryOutboxEvent_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async failUrlRegistryOutboxEvent_(
    input: unknown,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    return await failUrlRegistryOutboxEvent(
      transactionManager(sharedContext),
      input
    )
  }

  @InjectManager()
  async reclaimExpiredUrlRegistryOutboxEvents(
    input: unknown,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    return await this.reclaimExpiredUrlRegistryOutboxEvents_(
      input,
      sharedContext
    )
  }

  @InjectTransactionManager()
  protected async reclaimExpiredUrlRegistryOutboxEvents_(
    input: unknown,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    return await reclaimExpiredUrlRegistryOutboxEvents(
      transactionManager(sharedContext),
      input
    )
  }
}

export default UrlRegistryOutboxModuleService

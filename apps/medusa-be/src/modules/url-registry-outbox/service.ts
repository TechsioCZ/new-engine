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
  enqueueNormalizedProductLifecycleEvent,
  fingerprintProductLifecycleEvent,
} from "./enqueue"
import UrlRegistryOutboxEvent from "./models/url-registry-outbox-event"
import UrlRegistryOutboxStream from "./models/url-registry-outbox-stream"
import { normalizeProductLifecycleEventInput } from "./types"

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
    const manager = sharedContext.transactionManager
    if (!manager) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "URL registry outbox transaction manager is unavailable"
      )
    }
    return await enqueueNormalizedProductLifecycleEvent(
      manager,
      event,
      fingerprint
    )
  }
}

export default UrlRegistryOutboxModuleService

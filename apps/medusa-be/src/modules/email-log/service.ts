import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type { Context } from "@medusajs/framework/types"
import {
  generateEntityId,
  InjectManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import EmailLog from "./models/email-log"
import EmailWebhookEvent from "./models/email-webhook-event"

class EmailLogModuleService extends MedusaService({
  EmailLog,
  EmailWebhookEvent,
}) {
  @InjectManager()
  async recordEmailWebhookEventOnce(
    input: {
      email_id: string
      event_id: string
      payload: unknown
      received_at: Date
      type: string
    },
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<void> {
    const manager = sharedContext.manager
    if (!manager) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Email Log Module manager is unavailable while recording a webhook event."
      )
    }

    await manager.getConnection().execute(
      `insert into "email_webhook_event"
        ("id", "email_id", "event_id", "type", "payload", "received_at", "processed_at", "created_at", "updated_at", "deleted_at")
       values (?, ?, ?, ?, ?::jsonb, ?, null, now(), now(), null)
       on conflict ("event_id") where "deleted_at" is null and "event_id" is not null
       do nothing`,
      [
        generateEntityId(undefined, "emailevt"),
        input.email_id,
        input.event_id,
        input.type,
        JSON.stringify(input.payload),
        input.received_at,
      ]
    )
  }
}

export default EmailLogModuleService

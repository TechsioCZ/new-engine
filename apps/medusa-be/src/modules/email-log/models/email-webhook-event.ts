import { model } from "@medusajs/framework/utils"

const EmailWebhookEvent = model
  .define("email_webhook_event", {
    email_id: model.text(),
    id: model.id().primaryKey(),
    payload: model.json().nullable(),
    processed_at: model.dateTime().nullable(),
    received_at: model.dateTime(),
    type: model.text(),
  })
  .indexes([
    {
      name: "IDX_email_webhook_event_email_id",
      on: ["email_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_email_webhook_event_processed_at",
      on: ["processed_at"],
      where: "deleted_at IS NULL",
    },
  ])

export default EmailWebhookEvent

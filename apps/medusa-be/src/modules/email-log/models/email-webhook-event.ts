import { model } from "@medusajs/framework/utils"

const EmailWebhookEvent = model
  .define("email_webhook_event", {
    id: model.id().primaryKey(),
    email_id: model.text(),
    type: model.text(),
    payload: model.json().nullable(),
    received_at: model.dateTime(),
    processed_at: model.dateTime().nullable(),
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

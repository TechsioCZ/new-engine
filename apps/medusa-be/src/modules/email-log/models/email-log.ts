import { model } from "@medusajs/framework/utils"

const EmailLog = model
  .define("email_log", {
    checked_at: model.dateTime().nullable(),
    customer_id: model.text().nullable(),
    email_id: model.text(),
    id: model.id().primaryKey(),
    order_id: model.text().nullable(),
    sent_at: model.dateTime(),
    sent_to: model.text(),
    subject: model.text(),
    type: model.text(),
  })
  .indexes([
    {
      name: "IDX_email_log_email_id",
      on: ["email_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_email_log_customer_id",
      on: ["customer_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_email_log_order_id",
      on: ["order_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_email_log_sent_to",
      on: ["sent_to"],
      where: "deleted_at IS NULL",
    },
  ])

export default EmailLog

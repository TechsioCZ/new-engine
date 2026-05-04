import { model } from "@medusajs/framework/utils"

const EmailLog = model
  .define("email_log", {
    id: model.id().primaryKey(),
    email_id: model.text(),
    customer_id: model.text().nullable(),
    type: model.text(),
    subject: model.text(),
    sent_to: model.text(),
    sent_at: model.dateTime(),
    checked_at: model.dateTime().nullable(),
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
      name: "IDX_email_log_sent_to",
      on: ["sent_to"],
      where: "deleted_at IS NULL",
    },
  ])

export default EmailLog

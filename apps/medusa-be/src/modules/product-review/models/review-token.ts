import { model } from "@medusajs/framework/utils"

const ReviewToken = model
  .define("review_token", {
    id: model.id().primaryKey(),
    token: model.text(),
    order_id: model.text(),
    product_id: model.text(),
    customer_id: model.text().nullable(),
    email: model.text(),
    used_at: model.dateTime().nullable(),
    expires_at: model.dateTime().nullable(),
  })
  .indexes([
    {
      name: "IDX_review_token_token_unique",
      on: ["token"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_review_token_order_product_email_unique",
      on: ["order_id", "product_id", "email"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_review_token_order_id",
      on: ["order_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_review_token_product_id",
      on: ["product_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_review_token_customer_id",
      on: ["customer_id"],
      where: "deleted_at IS NULL",
    },
  ])

export default ReviewToken

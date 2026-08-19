import { model } from "@medusajs/framework/utils"

const OrderConfirmationAccess = model
  .define("order_confirmation_access", {
    id: model.id().primaryKey(),
    order_id: model.text(),
    public_order_id: model.text(),
    sales_channel_id: model.text(),
    customer_id: model.text().nullable(),
    token_hash: model.text(),
    expires_at: model.dateTime(),
    used_at: model.dateTime().nullable(),
  })
  .indexes([
    {
      name: "IDX_order_confirmation_access_order_unique",
      on: ["order_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_order_confirmation_access_public_order_unique",
      on: ["public_order_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_order_confirmation_access_token_hash",
      on: ["token_hash"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_order_confirmation_access_expires_at",
      on: ["expires_at"],
      where: "deleted_at IS NULL",
    },
  ])

export default OrderConfirmationAccess

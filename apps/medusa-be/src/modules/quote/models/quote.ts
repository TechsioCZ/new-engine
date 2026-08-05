import { model } from "@medusajs/framework/utils"

import { Message } from "./message"

export const Quote = model.define("quote", {
  cart_id: model.text(),
  customer_id: model.text(),
  draft_order_id: model.text(),
  id: model.id({ prefix: "quo" }).primaryKey(),
  messages: model.hasMany(() => Message),
  order_change_id: model.text(),
  status: model
    .enum([
      "pending_merchant",
      "pending_customer",
      "accepted",
      "customer_rejected",
      "merchant_rejected",
    ])
    .default("pending_merchant"),
})

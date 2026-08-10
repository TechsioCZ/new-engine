import { model } from "@medusajs/framework/utils"

let messageReference: typeof Message

export const Quote = model.define("quote", {
  cart_id: model.text(),
  customer_id: model.text(),
  draft_order_id: model.text(),
  id: model.id({ prefix: "quo" }).primaryKey(),
  messages: model.hasMany(() => messageReference),
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

export const Message = model.define("message", {
  admin_id: model.text().nullable(),
  customer_id: model.text().nullable(),
  id: model.id({ prefix: "mess" }).primaryKey(),
  item_id: model.text().nullable(),
  quote: model.belongsTo(() => Quote, { mappedBy: "messages" }),
  text: model.text(),
})

const initializeMessageReference = () => {
  messageReference = Message
}

initializeMessageReference()

import { model } from "@medusajs/framework/utils"

import { Quote } from "./quote"

export const Message = model.define("message", {
  admin_id: model.text().nullable(),
  customer_id: model.text().nullable(),
  id: model.id({ prefix: "mess" }).primaryKey(),
  item_id: model.text().nullable(),
  quote: model.belongsTo(() => Quote, { mappedBy: "messages" }),
  text: model.text(),
})

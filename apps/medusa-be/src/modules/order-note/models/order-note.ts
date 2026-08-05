import { model } from "@medusajs/framework/utils"

const OrderNote = model
  .define("order_note", {
    id: model.id({ prefix: "ordn" }).primaryKey(),
    note: model.text(),
    order_id: model.text(),
  })
  .indexes([
    {
      name: "IDX_order_note_order_id_unique",
      on: ["order_id"],
      unique: true,
      where: { deleted_at: null },
    },
  ])

export default OrderNote

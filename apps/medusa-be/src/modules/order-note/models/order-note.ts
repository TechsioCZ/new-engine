import { model } from "@medusajs/framework/utils"

const OrderNote = model
  .define("order_note", {
    id: model.id({ prefix: "ordn" }).primaryKey(),
    order_id: model.text(),
    note: model.text(),
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

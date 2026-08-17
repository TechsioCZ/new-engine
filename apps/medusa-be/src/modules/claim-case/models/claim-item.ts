import { model } from "@medusajs/framework/utils"
import ClaimCase from "./claim-case"

const ClaimItem = model
  .define("claim_item", {
    id: model.id().primaryKey(),
    claim: model.belongsTo(() => ClaimCase, { mappedBy: "items" }),
    order_item_id: model.text().nullable(),
    product_id: model.text().nullable(),
    variant_id: model.text().nullable(),
    title: model.text(),
    quantity: model.number(),
  })
  .indexes([
    {
      name: "IDX_claim_item_claim_id",
      on: ["claim_id"],
      where: { deleted_at: null },
    },
    {
      name: "IDX_claim_item_order_item_id",
      on: ["order_item_id"],
      where: "deleted_at IS NULL AND order_item_id IS NOT NULL",
    },
  ])
  .checks([
    {
      name: "CHK_claim_item_quantity",
      expression: (columns) => `${columns.quantity} >= 1`,
    },
  ])

export default ClaimItem

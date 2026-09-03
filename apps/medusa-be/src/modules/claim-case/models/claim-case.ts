import { model } from "@medusajs/framework/utils"
import ClaimItem from "./claim-item"

const ClaimCase = model
  .define("claim_case", {
    id: model.id().primaryKey(),
    case_number: model.text(),
    type: model.enum(["return", "complaint"]),
    status: model
      .enum([
        "submitted",
        "in_review",
        "waiting_for_customer",
        "resolved",
        "rejected",
      ])
      .default("submitted"),
    email: model.text(),
    order_id: model.text().nullable(),
    order_display_id: model.text().nullable(),
    sales_channel_id: model.text().nullable(),
    customer_id: model.text().nullable(),
    reason: model.text().nullable(),
    defect_description: model.text().nullable(),
    defect_discovered_at: model.dateTime().nullable(),
    requested_resolution: model
      .enum(["repair", "replacement", "discount", "refund"])
      .nullable(),
    purchase_details: model.text().nullable(),
    attachment_urls: model.json().nullable(),
    deadline_at: model.dateTime().nullable(),
    submitted_at: model.dateTime(),
    items: model.hasMany(() => ClaimItem, { mappedBy: "claim" }),
  })
  .indexes([
    {
      name: "IDX_claim_case_number_unique",
      on: ["case_number"],
      unique: true,
      where: { deleted_at: null },
    },
    {
      name: "IDX_claim_case_order_id",
      on: ["order_id"],
      where: "deleted_at IS NULL AND order_id IS NOT NULL",
    },
    {
      name: "IDX_claim_case_sales_channel_id",
      on: ["sales_channel_id"],
      where: "deleted_at IS NULL AND sales_channel_id IS NOT NULL",
    },
    {
      name: "IDX_claim_case_email",
      on: ["email"],
      where: { deleted_at: null },
    },
    {
      name: "IDX_claim_case_status",
      on: ["status"],
      where: { deleted_at: null },
    },
  ])

export default ClaimCase

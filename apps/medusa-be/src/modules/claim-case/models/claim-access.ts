import { model } from "@medusajs/framework/utils"

const ClaimAccess = model
  .define("claim_access", {
    id: model.id().primaryKey(),
    order_id: model.text(),
    email: model.text(),
    code_hash: model.text(),
    access_token_hash: model.text().nullable(),
    expires_at: model.dateTime(),
    verified_at: model.dateTime().nullable(),
    used_at: model.dateTime().nullable(),
    attempts: model.number().default(0),
  })
  .indexes([
    {
      name: "IDX_claim_access_order_email",
      on: ["order_id", "email"],
      where: { deleted_at: null },
    },
    {
      name: "IDX_claim_access_token_hash",
      on: ["access_token_hash"],
      where: "deleted_at IS NULL AND access_token_hash IS NOT NULL",
    },
    {
      name: "IDX_claim_access_expires_at",
      on: ["expires_at"],
      where: { deleted_at: null },
    },
  ])
  .checks([
    {
      name: "CHK_claim_access_attempts",
      expression: (columns) => `${columns.attempts} >= 0`,
    },
  ])

export default ClaimAccess

import { model } from "@medusajs/framework/utils"

const PaymentReturnState = model
  .define("payment_return_state", {
    id: model.id({ prefix: "payret" }).primaryKey(),
    state_hash: model.text(),
    cart_id: model.text(),
    sales_channel_id: model.text(),
    provider_id: model.text(),
    payment_session_id: model.text().nullable(),
    order_id: model.text().nullable(),
    result_token_hash: model.text().nullable(),
    result_expires_at: model.dateTime().nullable(),
    terminal_status: model.text().nullable(),
    response_count: model.number().default(0),
    expires_at: model.dateTime(),
    used_at: model.dateTime().nullable(),
    last_seen_at: model.dateTime().nullable(),
  })
  .indexes([
    {
      name: "IDX_payment_return_state_hash_unique",
      on: ["state_hash"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_payment_return_cart_provider_unique",
      on: ["cart_id", "provider_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_payment_return_expires_at",
      on: ["expires_at"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_payment_return_result_token_hash_unique",
      on: ["result_token_hash"],
      unique: true,
      where: "deleted_at IS NULL AND result_token_hash IS NOT NULL",
    },
  ])

export default PaymentReturnState

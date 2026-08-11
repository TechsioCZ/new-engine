import { model } from "@medusajs/framework/utils"

const GLSFulfillmentAttempt = model
  .define("gls_fulfillment_attempt", {
    id: model.id().primaryKey(),
    operation_key: model.text(),
    client_reference: model.text(),
    generation: model.number().default(1),
    status: model
      .enum(["pending", "completed", "cancelled"])
      .default("pending"),
    fulfillment_id: model.text().nullable(),
    parcel_id: model.text().nullable(),
    parcel_number: model.text().nullable(),
    barcode: model.text().nullable(),
    last_error: model.text().nullable(),
  })
  .indexes([
    {
      on: ["operation_key", "generation"],
      unique: true,
      where: { deleted_at: null },
    },
    { on: ["client_reference"], unique: true, where: { deleted_at: null } },
  ])

export default GLSFulfillmentAttempt

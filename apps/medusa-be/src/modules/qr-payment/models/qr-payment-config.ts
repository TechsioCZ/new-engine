import { model } from "@medusajs/framework/utils"

const QrPaymentConfig = model
  .define("qr_payment_config", {
    id: model.id().primaryKey(),
    environment: model.text(),
    iban: model.text().nullable(),
  })
  .indexes([{ on: ["environment"], unique: true, where: { deleted_at: null } }])

export default QrPaymentConfig

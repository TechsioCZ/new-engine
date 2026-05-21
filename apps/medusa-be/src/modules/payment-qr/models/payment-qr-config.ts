import { model } from "@medusajs/framework/utils"

const QrPaymentConfig = model.define("qr_payment_config", {
  id: model.id().primaryKey(),
  iban: model.text().nullable(),
})

export default QrPaymentConfig

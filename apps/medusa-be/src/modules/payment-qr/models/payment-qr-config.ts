import { model } from "@medusajs/framework/utils"

const QrPaymentConfig = model.define("qr_payment_config", {
  iban: model.text().nullable(),
  id: model.id().primaryKey(),
})

export default QrPaymentConfig

import { Module } from "@medusajs/framework/utils"
import createDefaultConfigLoader from "./loaders/create-default-config"
import { QrPaymentModuleService } from "./service"

export const QR_PAYMENT_MODULE = "qr_payment"

export default Module(QR_PAYMENT_MODULE, {
  service: QrPaymentModuleService,
  loaders: [createDefaultConfigLoader],
})

export type { QrPaymentModuleService } from "./service"

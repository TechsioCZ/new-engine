import { Module } from "@medusajs/framework/utils"
import { QR_PAYMENT_MODULE as QR_PAYMENT_MODULE_ID } from "./constants"
import createDefaultConfigLoader from "./loaders/create-default-config"
import { QrPaymentModuleService } from "./service"

export const QR_PAYMENT_MODULE = QR_PAYMENT_MODULE_ID

export default Module(QR_PAYMENT_MODULE, {
  service: QrPaymentModuleService,
  loaders: [createDefaultConfigLoader],
})

export type { QrPaymentModuleService } from "./service"

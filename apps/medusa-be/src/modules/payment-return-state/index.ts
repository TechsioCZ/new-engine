import { Module } from "@medusajs/framework/utils"
import PaymentReturnStateModuleService from "./service"

export const PAYMENT_RETURN_STATE_MODULE = "payment_return_state"

export default Module(PAYMENT_RETURN_STATE_MODULE, {
  service: PaymentReturnStateModuleService,
})

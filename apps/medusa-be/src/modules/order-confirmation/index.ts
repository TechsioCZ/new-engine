import { Module } from "@medusajs/framework/utils"
import OrderConfirmationModuleService from "./service"

export const ORDER_CONFIRMATION_MODULE = "order_confirmation"

export default Module(ORDER_CONFIRMATION_MODULE, {
  service: OrderConfirmationModuleService,
})

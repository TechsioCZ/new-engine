import { Module } from "@medusajs/framework/utils"
import OrderReceiptModuleService from "./service"

export const ORDER_RECEIPT_MODULE = "order_receipt"

export default Module(ORDER_RECEIPT_MODULE, {
  service: OrderReceiptModuleService,
})

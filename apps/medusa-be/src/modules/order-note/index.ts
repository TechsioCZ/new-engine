import { Module } from "@medusajs/framework/utils"
import OrderNoteModuleService from "./service"

export const ORDER_NOTE_MODULE = "orderNote"

export default Module(ORDER_NOTE_MODULE, {
  service: OrderNoteModuleService,
})

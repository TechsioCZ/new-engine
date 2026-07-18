import { Module } from "@medusajs/framework/utils"

import ProducerModuleService from "./service"

export const PRODUCER_MODULE = "producer"

export default Module(PRODUCER_MODULE, {
  service: ProducerModuleService,
})

import { Module } from "@medusajs/framework/utils"

import createDefaultConfigLoader from "./loaders/create-default-config"
import { PplClientModuleService } from "./service"

export const PPL_CLIENT_MODULE = "ppl_client"

export default Module(PPL_CLIENT_MODULE, {
  service: PplClientModuleService,
  loaders: [createDefaultConfigLoader],
})

export type { PplClientModuleService } from "./service"

// Re-export types and constants for consumers
export type {
  PplBatchItem,
  PplBatchResponse,
  PplFulfillmentData,
  PplShipmentInfo,
  PplShipmentState,
} from "./types"

export {
  PPL_DELIVERED_STATES,
  PPL_FAILED_STATES,
  PPL_STATUS_MESSAGES,
} from "./types"

import { Module } from "@medusajs/framework/utils"

import { GLS_CLIENT_MODULE } from "./constants"
import createDefaultConfigLoader from "./loaders/create-default-config"
import { GLSClientModuleService } from "./service"

export { GLS_CLIENT_MODULE, GLS_PROVIDER_ID } from "./constants"

export default Module(GLS_CLIENT_MODULE, {
  loaders: [createDefaultConfigLoader],
  service: GLSClientModuleService,
})

export type { GLSClientModuleService } from "./service"

export type {
  GLSBranch,
  GLSFulfillmentData,
  GLSPacketStatusRecord,
  GLSShipmentState,
  GLSShippingOptionData,
} from "./types"

export {
  GLS_DELIVERED_STATES,
  GLS_FAILED_STATES,
  GLS_STATUS_MESSAGES,
} from "./types"

import { Module } from "@medusajs/framework/utils"
import createDefaultConfigLoader from "./loaders/create-default-config"
import { GLSClientModuleService } from "./service"

export const GLS_CLIENT_MODULE = "gls_client"

export default Module(GLS_CLIENT_MODULE, {
  service: GLSClientModuleService,
  loaders: [createDefaultConfigLoader],
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

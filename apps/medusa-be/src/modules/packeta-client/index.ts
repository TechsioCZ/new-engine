import { Module } from "@medusajs/framework/utils"
import createDefaultConfigLoader from "./loaders/create-default-config"
import { PacketaClientModuleService } from "./service"

export const PACKETA_CLIENT_MODULE = "packeta_client"

export default Module(PACKETA_CLIENT_MODULE, {
  service: PacketaClientModuleService,
  loaders: [createDefaultConfigLoader],
})

export type { PacketaClientModuleService } from "./service"

export type {
  PacketaBranch,
  PacketaFulfillmentData,
  PacketaPacketStatusRecord,
  PacketaShipmentState,
  PacketaShippingOptionData,
} from "./types"

export {
  PACKETA_DELIVERED_STATES,
  PACKETA_FAILED_STATES,
  PACKETA_STATUS_MESSAGES,
} from "./types"

import { Module } from "@medusajs/framework/utils"
import PayloadModuleService from "./service"

/** Module registration key for the Payload integration. */
export const PAYLOAD_MODULE = "payload"

/** Medusa module definition for the Payload integration. */
export default Module(PAYLOAD_MODULE, {
  service: PayloadModuleService,
})

export * from "./service"
export * from "./types"

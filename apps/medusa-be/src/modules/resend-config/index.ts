import { Module } from "@medusajs/framework/utils"
import { RESEND_CONFIG_MODULE } from "./constants"
import ResendConfigModuleService from "./service"

export default Module(RESEND_CONFIG_MODULE, {
  service: ResendConfigModuleService,
})

export { DEFAULT_RESEND_API_URL, RESEND_CONFIG_MODULE } from "./constants"
export type { default as ResendConfigModuleService } from "./service"
export type {
  ResendConfigAdminDTO,
  ResendConfigUpdateInput,
  ResendRuntimeConfig,
} from "./types"

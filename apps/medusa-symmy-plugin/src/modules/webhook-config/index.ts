import type { ModuleExports } from "@medusajs/framework/types"
import { Module } from "@medusajs/framework/utils"
import { SymmyWebhookConfigModuleService } from "./service"

export const SYMMY_WEBHOOK_CONFIG_MODULE = "symmy_webhook_config"

const symmyWebhookConfigModule: ModuleExports<
  typeof SymmyWebhookConfigModuleService
> = Module(SYMMY_WEBHOOK_CONFIG_MODULE, {
  service: SymmyWebhookConfigModuleService,
})

export default symmyWebhookConfigModule

export type {
  SymmyWebhookConfigDTO,
  SymmyWebhookConfigModuleService,
  SymmyWebhookEndpoint,
  SymmyWebhookJobPayload,
  UpdateSymmyWebhookConfigInput,
} from "./service"

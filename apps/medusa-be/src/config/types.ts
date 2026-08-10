import type {
  InputConfigModules,
  InputConfigWithArrayModules,
} from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

export type MedusaAdminConfig = NonNullable<
  InputConfigWithArrayModules["admin"]
>
export type MedusaModuleConfig = InputConfigModules[number]
export type MedusaModulesConfig = InputConfigModules
export type MedusaPluginConfig = NonNullable<
  InputConfigWithArrayModules["plugins"]
>[number]
export type MedusaPluginsConfig = NonNullable<
  InputConfigWithArrayModules["plugins"]
>
export type MedusaProjectConfig = NonNullable<
  InputConfigWithArrayModules["projectConfig"]
>

export const assertUnhandledConfigValue = (value: never): never => {
  const error = new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "Unhandled config value",
  )
  error.cause = value
  throw error
}

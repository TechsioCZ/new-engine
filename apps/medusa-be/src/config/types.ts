import type {
  InputConfigModules,
  InputConfigWithArrayModules,
} from "@medusajs/framework/types"

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
  throw new Error("Unhandled config value", { cause: value })
}

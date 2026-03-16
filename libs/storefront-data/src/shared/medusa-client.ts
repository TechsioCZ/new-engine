import Medusa from "@medusajs/js-sdk"
import type { Config } from "@medusajs/js-sdk"
import { omitKeys } from "./object-utils"

export type MedusaClientConfig = Config

export type CreateMedusaSdkOptions = {
  disableAuthOnServer?: boolean
}

export type MedusaSdk = InstanceType<typeof Medusa>

export function createMedusaSdk(
  config: MedusaClientConfig,
  options: CreateMedusaSdkOptions = {}
): MedusaSdk {
  const { disableAuthOnServer = true } = options
  if (disableAuthOnServer && typeof window === "undefined" && config.auth) {
    return new Medusa(omitKeys(config, ["auth"]))
  }
  return new Medusa(config)
}

import Medusa from "@medusajs/js-sdk"
import type { Config } from "@medusajs/js-sdk"

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
    const { auth: _auth, ...rest } = config
    return new Medusa(rest)
  }
  return new Medusa(config)
}

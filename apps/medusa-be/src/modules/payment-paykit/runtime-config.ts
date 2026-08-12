import { MedusaError } from "@medusajs/framework/utils"
import {
  getCredentialBoolean,
  getCredentialString,
  INTEGRATION_CONFIG_NAMES,
  requireCredentialObject,
  requireEnabledIntegrationConfig,
} from "../api-store/integration-config"
import type { PaykitInjectedDependencies } from "./core/base"
import type {
  PaykitComgateOptions,
  PaykitGopayOptions,
  PaykitStripeOptions,
} from "./types"

const requireValue = (
  integration: string,
  value: string | undefined,
  label: string
): string => {
  if (!value) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${integration} API Store config must contain ${label}`
    )
  }

  return value
}

const configuredName = (value: string | undefined, fallback: string) =>
  value?.trim() || fallback

export const resolveGopayRuntimeOptions = async (
  container: PaykitInjectedDependencies,
  options: PaykitGopayOptions
): Promise<PaykitGopayOptions> => {
  const name = configuredName(
    options.apiStoreName,
    INTEGRATION_CONFIG_NAMES.GOPAY
  )
  const config = await requireEnabledIntegrationConfig(container, name)
  const credentials = requireCredentialObject(config)

  return {
    ...options,
    clientId: requireValue(
      name,
      getCredentialString(credentials, "clientId", "client_id"),
      "client_id"
    ),
    clientSecret: requireValue(
      name,
      getCredentialString(credentials, "clientSecret", "client_secret"),
      "client_secret"
    ),
    goId: requireValue(
      name,
      getCredentialString(credentials, "goId", "go_id"),
      "go_id"
    ),
    isSandbox: getCredentialBoolean(
      credentials,
      "isSandbox",
      options.isSandbox ?? true
    ),
    webhookUrl: requireValue(
      name,
      getCredentialString(credentials, "webhookUrl", "webhook_url"),
      "webhook_url"
    ),
  }
}

export const resolveStripeRuntimeOptions = async (
  container: PaykitInjectedDependencies,
  options: PaykitStripeOptions
): Promise<PaykitStripeOptions> => {
  const name = configuredName(
    options.apiStoreName,
    INTEGRATION_CONFIG_NAMES.STRIPE
  )
  const config = await requireEnabledIntegrationConfig(container, name)
  const credentials = requireCredentialObject(config)

  return {
    ...options,
    apiKey: requireValue(
      name,
      config.api_key ?? getCredentialString(credentials, "apiKey", "api_key"),
      "api_key"
    ),
    webhookSecret: requireValue(
      name,
      getCredentialString(credentials, "webhookSecret", "webhook_secret"),
      "webhook_secret"
    ),
  }
}

export const resolveComgateRuntimeOptions = async (
  container: PaykitInjectedDependencies,
  options: PaykitComgateOptions
): Promise<PaykitComgateOptions> => {
  const name = configuredName(
    options.apiStoreName,
    INTEGRATION_CONFIG_NAMES.COMGATE
  )
  const config = await requireEnabledIntegrationConfig(container, name)
  const credentials = requireCredentialObject(config)

  return {
    ...options,
    merchant: requireValue(
      name,
      getCredentialString(credentials, "merchant"),
      "merchant"
    ),
    secret: requireValue(
      name,
      config.api_key ?? getCredentialString(credentials, "secret"),
      "secret"
    ),
    isSandbox: getCredentialBoolean(
      credentials,
      "isSandbox",
      options.isSandbox ?? true
    ),
  }
}

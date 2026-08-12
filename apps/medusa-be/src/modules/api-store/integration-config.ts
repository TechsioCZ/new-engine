import { MedusaError } from "@medusajs/framework/utils"
import { API_STORE_MODULE, type ApiStoreModuleService } from "."
import type { ApiStoreSecretDTO } from "./types"

export const INTEGRATION_CONFIG_NAMES = {
  RESEND: "Resend",
  GOPAY: "GoPay",
  STRIPE: "Stripe",
  COMGATE: "Comgate",
  PRODUCT_REVIEW_REQUEST: "Product review request",
} as const

export type IntegrationConfigName =
  (typeof INTEGRATION_CONFIG_NAMES)[keyof typeof INTEGRATION_CONFIG_NAMES]

export type IntegrationConfigContainer = Record<string, unknown>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const getCredentialString = (
  credentials: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | undefined => {
  if (!credentials) {
    return
  }

  for (const key of keys) {
    const value = credentials[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return
}

export const getCredentialBoolean = (
  credentials: Record<string, unknown> | null | undefined,
  key: string,
  defaultValue: boolean
): boolean => {
  const value = credentials?.[key]

  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "string") {
    return value === "1" || value.toLowerCase() === "true"
  }

  return defaultValue
}

export const resolveApiStoreService = (
  container: IntegrationConfigContainer
): ApiStoreModuleService | undefined => {
  const service = container[API_STORE_MODULE]

  if (service) {
    return service as ApiStoreModuleService
  }

  const resolver = container.resolve
  if (typeof resolver === "function") {
    try {
      return resolver.call(container, API_STORE_MODULE) as ApiStoreModuleService
    } catch {
      return
    }
  }

  return
}

export const retrieveIntegrationConfig = async (
  container: IntegrationConfigContainer,
  name: IntegrationConfigName | string
): Promise<ApiStoreSecretDTO | null> => {
  const service = resolveApiStoreService(container)

  if (!service) {
    return null
  }

  return await service.retrieveApiStoreSecretsByName(name)
}

export const requireEnabledIntegrationConfig = async (
  container: IntegrationConfigContainer,
  name: IntegrationConfigName | string
): Promise<ApiStoreSecretDTO> => {
  const config = await retrieveIntegrationConfig(container, name)

  if (!config) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `${name} is not configured. Add it in Settings → API Store.`
    )
  }

  if (!config.enabled) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `${name} is disabled in Settings → API Store.`
    )
  }

  return config
}

export const requireCredentialObject = (
  config: ApiStoreSecretDTO
): Record<string, unknown> => {
  if (isRecord(config.credentials)) {
    return config.credentials
  }

  return {}
}

import { MedusaError } from "@medusajs/framework/utils"

import { API_STORE_MODULE } from "."
import ApiStoreModuleService from "./service"
import type { ApiStoreSecretDTO } from "./types"

export const INTEGRATION_CONFIG_NAMES = {
  COMGATE: "Comgate",
  GOPAY: "GoPay",
  PACKETA_PICKUP_POINTS: "Packeta Pickup Points",
  PRODUCT_REVIEW_REQUEST: "Product review request",
  RESEND: "Resend",
  STRIPE: "Stripe",
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
  if (credentials === null || credentials === undefined) {
    return undefined
  }

  for (const key of keys) {
    const value = credentials[key]
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim()
    }
  }

  return undefined
}

export const getCredentialBoolean = (
  credentials: Record<string, unknown> | null | undefined,
  key: string,
  defaultValue: boolean,
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

const isApiStoreModuleService = (
  value: unknown,
): value is ApiStoreModuleService => value instanceof ApiStoreModuleService

export const resolveApiStoreService = (
  container: IntegrationConfigContainer,
): ApiStoreModuleService | undefined => {
  const service = container[API_STORE_MODULE]

  if (isApiStoreModuleService(service)) {
    return service
  }

  const resolver = container["resolve"]
  if (typeof resolver !== "function") {
    return undefined
  }

  const resolved: unknown = Reflect.apply(resolver, container, [
    API_STORE_MODULE,
  ])
  return isApiStoreModuleService(resolved) ? resolved : undefined
}

export const retrieveIntegrationConfig = async (
  container: IntegrationConfigContainer,
  name: string,
): Promise<ApiStoreSecretDTO | null> => {
  const service = resolveApiStoreService(container)

  if (service === undefined) {
    return null
  }

  return await service.retrieveApiStoreSecretsByName(name)
}

export const requireEnabledIntegrationConfig = async (
  container: IntegrationConfigContainer,
  name: string,
): Promise<ApiStoreSecretDTO> => {
  const config = await retrieveIntegrationConfig(container, name)

  if (config === null) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `${name} is not configured. Add it in Settings → API Store.`,
    )
  }

  if (!config.enabled) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `${name} is disabled in Settings → API Store.`,
    )
  }

  return config
}

export const requireCredentialObject = (
  config: ApiStoreSecretDTO,
): Record<string, unknown> =>
  isRecord(config.credentials) ? config.credentials : {}

import { INTEGRATION_CONFIG_NAMES } from "../api-store/integration-config"
import {
  PAYKIT_COMGATE_PROVIDER_ID,
  PAYKIT_GOPAY_PROVIDER_ID,
  PAYKIT_STRIPE_PROVIDER_ID,
} from "./constants"

type PaykitConfigEnv = NodeJS.ProcessEnv

const PAYKIT_PROVIDER_FEATURE_FLAGS = {
  GOPAY: "FEATURE_PAYKIT_GOPAY_ENABLED",
  STRIPE: "FEATURE_PAYKIT_STRIPE_ENABLED",
  COMGATE: "FEATURE_PAYKIT_COMGATE_ENABLED",
} as const

type PaykitProviderFeature = keyof typeof PAYKIT_PROVIDER_FEATURE_FLAGS

export type PaykitPaymentProviderConfig = {
  id: string
  options: Record<string, unknown>
  resolve: string
}

const parseBooleanEnv = (
  value: string | undefined,
  defaultValue: boolean
): boolean => {
  if (value === undefined || value === "") {
    return defaultValue
  }

  return value === "1" || value.toLowerCase() === "true"
}

const isPaykitProviderEnabledForEnv = (
  env: PaykitConfigEnv,
  provider: PaykitProviderFeature
): boolean => {
  const providerFlag = env[PAYKIT_PROVIDER_FEATURE_FLAGS[provider]]

  if (providerFlag === "1") {
    return true
  }

  if (providerFlag === "0") {
    return false
  }

  return env.FEATURE_PAYKIT_ENABLED === "1"
}

export const buildPaykitPaymentProviders = (
  env: PaykitConfigEnv = process.env
): PaykitPaymentProviderConfig[] => {
  const providers: PaykitPaymentProviderConfig[] = []
  const debug = env.PAYKIT_DEBUG === "1"

  if (isPaykitProviderEnabledForEnv(env, "GOPAY")) {
    providers.push({
      resolve: "./src/modules/payment-paykit/services/gopay",
      id: PAYKIT_GOPAY_PROVIDER_ID,
      options: {
        apiStoreName: INTEGRATION_CONFIG_NAMES.GOPAY,
        isSandbox: parseBooleanEnv(env.GOPAY_SANDBOX, true),
        debug,
      },
    })
  }

  if (isPaykitProviderEnabledForEnv(env, "STRIPE")) {
    providers.push({
      resolve: "./src/modules/payment-paykit/services/stripe",
      id: PAYKIT_STRIPE_PROVIDER_ID,
      options: {
        apiStoreName: INTEGRATION_CONFIG_NAMES.STRIPE,
        debug,
      },
    })
  }

  if (isPaykitProviderEnabledForEnv(env, "COMGATE")) {
    providers.push({
      resolve: "./src/modules/payment-paykit/services/comgate",
      id: PAYKIT_COMGATE_PROVIDER_ID,
      options: {
        apiStoreName: INTEGRATION_CONFIG_NAMES.COMGATE,
        isSandbox: parseBooleanEnv(env.COMGATE_SANDBOX, true),
        debug,
      },
    })
  }

  return providers
}

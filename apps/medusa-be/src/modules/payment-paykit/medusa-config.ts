import {
  PAYKIT_COMGATE_PROVIDER_ID,
  PAYKIT_GOPAY_PROVIDER_ID,
  PAYKIT_STRIPE_PROVIDER_ID,
} from "./constants"

type PaykitConfigEnv = NodeJS.ProcessEnv

const PAYKIT_PROVIDER_FEATURE_FLAGS = {
  COMGATE: "FEATURE_PAYKIT_COMGATE_ENABLED",
  GOPAY: "FEATURE_PAYKIT_GOPAY_ENABLED",
  STRIPE: "FEATURE_PAYKIT_STRIPE_ENABLED",
} as const

type PaykitProviderFeature = keyof typeof PAYKIT_PROVIDER_FEATURE_FLAGS

export interface PaykitPaymentProviderConfig {
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

const requirePaykitEnv = (
  env: PaykitConfigEnv,
  label: string,
  names: string[]
): void => {
  const missing = names.filter((name) => !env[name]?.trim())

  if (missing.length) {
    throw new Error(
      `${label} missing required environment variable(s): ${missing.join(", ")}`
    )
  }
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

  return env["FEATURE_PAYKIT_ENABLED"] === "1"
}

export const buildPaykitPaymentProviders = (
  env: PaykitConfigEnv = process.env
): PaykitPaymentProviderConfig[] => {
  const providers: PaykitPaymentProviderConfig[] = []
  const debug = env["PAYKIT_DEBUG"] === "1"

  if (isPaykitProviderEnabledForEnv(env, "GOPAY")) {
    requirePaykitEnv(env, "PayKit GoPay", [
      "GOPAY_CLIENT_ID",
      "GOPAY_CLIENT_SECRET",
      "GOPAY_GO_ID",
      "GOPAY_WEBHOOK_URL",
    ])

    providers.push({
      id: PAYKIT_GOPAY_PROVIDER_ID,
      options: {
        clientId: env["GOPAY_CLIENT_ID"],
        clientSecret: env["GOPAY_CLIENT_SECRET"],
        debug,
        goId: env["GOPAY_GO_ID"],
        isSandbox: parseBooleanEnv(env["GOPAY_SANDBOX"], true),
        webhookUrl: env["GOPAY_WEBHOOK_URL"],
      },
      resolve: "./src/modules/payment-paykit/services/gopay",
    })
  }

  if (isPaykitProviderEnabledForEnv(env, "STRIPE")) {
    requirePaykitEnv(env, "PayKit Stripe", [
      "STRIPE_API_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ])

    providers.push({
      id: PAYKIT_STRIPE_PROVIDER_ID,
      options: {
        apiKey: env["STRIPE_API_KEY"],
        debug,
        webhookSecret: env["STRIPE_WEBHOOK_SECRET"],
      },
      resolve: "./src/modules/payment-paykit/services/stripe",
    })
  }

  if (isPaykitProviderEnabledForEnv(env, "COMGATE")) {
    requirePaykitEnv(env, "PayKit Comgate", [
      "COMGATE_MERCHANT",
      "COMGATE_SECRET",
    ])

    providers.push({
      id: PAYKIT_COMGATE_PROVIDER_ID,
      options: {
        debug,
        isSandbox: parseBooleanEnv(env["COMGATE_SANDBOX"], true),
        merchant: env["COMGATE_MERCHANT"],
        paymentLabel: env["COMGATE_PAYMENT_LABEL"],
        secret: env["COMGATE_SECRET"],
      },
      resolve: "./src/modules/payment-paykit/services/comgate",
    })
  }

  return providers
}

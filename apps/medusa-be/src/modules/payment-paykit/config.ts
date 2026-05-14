export const PAYKIT_PAYMENT_PROVIDER_IDENTIFIER = "paykit"
export const PAYKIT_GOPAY_PROVIDER_ID = "gopay"
export const PAYKIT_STRIPE_PROVIDER_ID = "stripe"
export const PAYKIT_COMGATE_PROVIDER_ID = "comgate"

// Medusa's payment webhook handler prepends `pp_` to this event provider,
// so `paykit_gopay` resolves to the registered provider `pp_paykit_gopay`.
export const PAYKIT_GOPAY_WEBHOOK_PROVIDER_ID = "paykit_gopay"
export const PAYKIT_GOPAY_WEBHOOK_PATH = "/hooks/payment/paykit_gopay"

export const PAYKIT_PROVIDER_FEATURE_FLAGS = {
  GOPAY: "FEATURE_PAYKIT_GOPAY_ENABLED",
  STRIPE: "FEATURE_PAYKIT_STRIPE_ENABLED",
  COMGATE: "FEATURE_PAYKIT_COMGATE_ENABLED",
} as const

export type PaykitProviderFeature = keyof typeof PAYKIT_PROVIDER_FEATURE_FLAGS

export const isPaykitProviderEnabled = (
  provider: PaykitProviderFeature
): boolean => {
  const providerFlag = process.env[PAYKIT_PROVIDER_FEATURE_FLAGS[provider]]

  if (providerFlag === "1") {
    return true
  }

  if (providerFlag === "0") {
    return false
  }

  return process.env.FEATURE_PAYKIT_ENABLED === "1"
}

export const parseBooleanEnv = (
  value: string | undefined,
  defaultValue: boolean
): boolean => {
  if (value === undefined || value === "") {
    return defaultValue
  }

  return value === "1" || value.toLowerCase() === "true"
}

export const requirePaykitOptions = (
  label: string,
  options: Record<string, unknown>,
  keys: string[]
): void => {
  const missing = keys.filter((key) => {
    const value = options[key]

    return value === undefined || value === null || value === ""
  })

  if (missing.length) {
    throw new Error(
      `${label} missing required option(s): ${missing.join(", ")}`
    )
  }
}

export const PAYKIT_PAYMENT_PROVIDER_IDENTIFIER = "paykit"
export const PAYKIT_GOPAY_PROVIDER_ID = "gopay"
export const PAYKIT_GOPAY_MEDUSA_PROVIDER_ID = "pp_paykit_gopay"
export const PAYKIT_GOPAY_WEBHOOK_PROVIDER_ID = "paykit_gopay"
export const PAYKIT_GOPAY_WEBHOOK_PATH = "/hooks/payment/paykit_gopay"
export const PAYKIT_STRIPE_PROVIDER_ID = "stripe"
export const PAYKIT_STRIPE_MEDUSA_PROVIDER_ID = "pp_paykit_stripe"
export const PAYKIT_STRIPE_WEBHOOK_PROVIDER_ID = "paykit_stripe"
export const PAYKIT_COMGATE_PROVIDER_ID = "comgate"
export const PAYKIT_COMGATE_MEDUSA_PROVIDER_ID = "pp_paykit_comgate"
export const PAYKIT_COMGATE_WEBHOOK_PROVIDER_ID = "paykit_comgate"

export const isPaykitProviderEnabled = (provider: string): boolean => {
  const providerFlag = process.env[`FEATURE_PAYKIT_${provider}_ENABLED`]

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
  const missing = keys.filter((key) => !options[key])

  if (missing.length) {
    throw new Error(
      `${label} missing required option(s): ${missing.join(", ")}`
    )
  }
}

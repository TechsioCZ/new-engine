export const PAYKIT_PAYMENT_PROVIDER_IDENTIFIER = "paykit"
export const PAYKIT_GOPAY_PROVIDER_ID = "gopay"
export const PAYKIT_GOPAY_MEDUSA_PROVIDER_ID = "pp_paykit_gopay"

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

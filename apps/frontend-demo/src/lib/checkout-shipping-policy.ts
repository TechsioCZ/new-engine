import type { HttpTypes } from "@medusajs/types"

type ExtendedShippingOption = HttpTypes.StoreCartShippingOption & {
  provider?: { is_enabled?: boolean | null } | null
  data?: { requires_access_point?: boolean | null } | null
  type?: { code?: string | null } | null
}

const DEFAULT_BLOCKED_SHIPPING_CODES = ["standard", "express"]

const parseBooleanEnv = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === "true") {
    return true
  }
  if (normalized === "false") {
    return false
  }

  return fallback
}

const parseCodeList = (value: string | undefined): string[] => {
  if (value === undefined) {
    return DEFAULT_BLOCKED_SHIPPING_CODES
  }

  if (value.trim().length === 0) {
    return []
  }

  return value
    .split(",")
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean)
}

const BLOCKED_SHIPPING_CODES = new Set(
  parseCodeList(process.env.NEXT_PUBLIC_CHECKOUT_BLOCKED_SHIPPING_CODES)
)

const EXCLUDE_DISABLED_PROVIDERS = parseBooleanEnv(
  process.env.NEXT_PUBLIC_CHECKOUT_EXCLUDE_DISABLED_PROVIDERS,
  true
)

const EXCLUDE_ACCESS_POINT_OPTIONS = parseBooleanEnv(
  process.env.NEXT_PUBLIC_CHECKOUT_EXCLUDE_ACCESS_POINT_OPTIONS,
  true
)

export const checkoutShippingPolicy = {
  blockedCodes: Array.from(BLOCKED_SHIPPING_CODES),
  excludeDisabledProviders: EXCLUDE_DISABLED_PROVIDERS,
  excludeAccessPointOptions: EXCLUDE_ACCESS_POINT_OPTIONS,
}

export const isCheckoutShippingOptionSupported = (
  option: HttpTypes.StoreCartShippingOption
): boolean => {
  const normalizedOption = option as ExtendedShippingOption

  if (
    EXCLUDE_DISABLED_PROVIDERS &&
    normalizedOption.provider?.is_enabled === false
  ) {
    return false
  }

  if (
    EXCLUDE_ACCESS_POINT_OPTIONS &&
    normalizedOption.data?.requires_access_point === true
  ) {
    return false
  }

  const code = normalizedOption.type?.code?.toLowerCase()
  if (code && BLOCKED_SHIPPING_CODES.has(code)) {
    return false
  }

  return true
}

import type {
  LoginFormValues,
  RegisterFormValues,
} from "@/lib/auth/auth-form-validators"
import { normalizeCountryCode } from "@/lib/forms/country-options"
import { appHref, toAppHref } from "@/lib/routing"
import type { AppHref } from "@/lib/routing"

interface BuildRegisterDefaultsOptions {
  countryCode?: string | null
}

export const resolveSafeRedirectHref = (value?: string): AppHref | null => {
  if (!value) {
    return null
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null
  }

  return toAppHref(value)
}

export const buildAuthRouteHref = (
  path: "/auth/login" | "/auth/register",
  next?: string,
) => {
  if (!next) {
    return path
  }

  return `${path}?next=${encodeURIComponent(next)}`
}

export const resolveAfterAuthHref = (
  value?: string | string[],
  fallback: AppHref = appHref("/account"),
) => {
  const nextValue = typeof value === "string" ? value : undefined
  return resolveSafeRedirectHref(nextValue) ?? fallback
}

export const buildLoginDefaults = (): LoginFormValues => ({
  email: "",
  password: "",
})

export const buildRegisterDefaults = ({
  countryCode,
}: BuildRegisterDefaultsOptions = {}): RegisterFormValues => ({
  accept_terms: false,
  account_type: "retail",
  billing_address_1: "",
  billing_address_2: "",
  billing_city: "",
  billing_country_code: normalizeCountryCode(countryCode) ?? "",
  billing_postal_code: "",
  company_identifier: "",
  company_name: "",
  confirm_password: "",
  email: "",
  first_name: "",
  last_name: "",
  password: "",
})

export const buildRegisterSuccessNotice = ({
  isWholesale,
  transferNotice,
  wholesaleNotice,
}: {
  isWholesale: boolean
  transferNotice: string | null
  wholesaleNotice: string
}) =>
  [isWholesale ? wholesaleNotice : null, transferNotice]
    .filter((notice): notice is string => Boolean(notice))
    .join(" ") || null

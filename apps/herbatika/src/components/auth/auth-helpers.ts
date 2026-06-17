import type {
  LoginFormValues,
  RegisterFormValues,
} from "@/lib/auth/auth-form-validators"
import { normalizeCountryCode } from "@/lib/forms/country-options"

type BuildRegisterDefaultsOptions = {
  countryCode?: string | null
}

export const resolveSafeRedirectHref = (value?: string) => {
  if (!value) {
    return null
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null
  }

  return value
}

export const buildAuthRouteHref = (
  path: "/auth/login" | "/auth/register",
  next?: string
) => {
  if (!next) {
    return path
  }

  return `${path}?next=${encodeURIComponent(next)}`
}

export const resolveAfterAuthHref = (
  value?: string | string[],
  fallback = "/account"
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
  account_type: "retail",
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  confirm_password: "",
  company_name: "",
  company_identifier: "",
  billing_address_1: "",
  billing_address_2: "",
  billing_city: "",
  billing_postal_code: "",
  billing_country_code: normalizeCountryCode(countryCode) ?? "SK",
  accept_terms: false,
})

export const buildRegisterSuccessNotice = ({
  isWholesale,
  transferNotice,
}: {
  isWholesale: boolean
  transferNotice: string | null
}) =>
  [
    isWholesale
      ? "Žiadosť o VO účet čaká na schválenie. Do rozhodnutia môžete nakupovať ako bežný zákazník."
      : null,
    transferNotice,
  ]
    .filter((notice): notice is string => Boolean(notice))
    .join(" ") || null

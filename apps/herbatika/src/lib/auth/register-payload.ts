import {
  isWholesaleRegistration,
  type RegisterFormValues,
} from "@/lib/auth/auth-form-validators"
import { REGISTRATION_TERMS_VERSION } from "@/lib/auth/registration-policy"
import { normalizeCountryCode } from "@/lib/forms/country-options"
import type { AuthRegisterInput } from "@/lib/storefront/auth"

type BuildAuthRegisterInputOptions = {
  currencyCode: string
}

export type AuthRegisterPolicyInput = AuthRegisterInput & {
  accept_terms: boolean
  terms_version: typeof REGISTRATION_TERMS_VERSION
}

const trimValue = (value: string) => value.trim()

export const buildAuthRegisterInput = (
  values: RegisterFormValues,
  { currencyCode }: BuildAuthRegisterInputOptions
): AuthRegisterPolicyInput => ({
  email: values.email,
  password: values.password,
  first_name: values.first_name,
  last_name: values.last_name,
  accept_terms: values.accept_terms,
  terms_version: REGISTRATION_TERMS_VERSION,
  ...(isWholesaleRegistration(values)
    ? {
        wholesale: {
          company_name: trimValue(values.company_name),
          company_identifier: trimValue(values.company_identifier),
          currency_code: currencyCode,
          billing_address: {
            address_1: trimValue(values.billing_address_1),
            address_2: trimValue(values.billing_address_2) || undefined,
            city: trimValue(values.billing_city),
            postal_code: trimValue(values.billing_postal_code),
            country_code:
              normalizeCountryCode(values.billing_country_code) ??
              trimValue(values.billing_country_code),
          },
        },
      }
    : {}),
})

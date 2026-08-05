import { isWholesaleRegistration } from "@/lib/auth/auth-form-validators"
import type { RegisterFormValues } from "@/lib/auth/auth-form-validators"
import { normalizeCountryCode } from "@/lib/forms/country-options"
import type { AuthRegisterInput } from "@/lib/storefront/auth"

interface BuildAuthRegisterInputOptions {
  currencyCode: string
}

const trimValue = (value: string) => value.trim()

export const buildAuthRegisterInput = (
  values: RegisterFormValues,
  { currencyCode }: BuildAuthRegisterInputOptions
): AuthRegisterInput => ({
  email: values.email,
  first_name: values.first_name,
  last_name: values.last_name,
  password: values.password,
  ...(isWholesaleRegistration(values)
    ? {
        wholesale: {
          billing_address: {
            address_1: trimValue(values.billing_address_1),
            ...(trimValue(values.billing_address_2)
              ? { address_2: trimValue(values.billing_address_2) }
              : {}),
            city: trimValue(values.billing_city),
            postal_code: trimValue(values.billing_postal_code),
            country_code:
              normalizeCountryCode(values.billing_country_code) ??
              trimValue(values.billing_country_code),
          },
          company_identifier: trimValue(values.company_identifier),
          company_name: trimValue(values.company_name),
          currency_code: currencyCode,
        },
      }
    : {}),
})

import {
  isWholesaleRegistration,
  type RegisterFormValues,
} from "@/lib/auth/auth-form-validators"
import { formatPostalCodeForCountry } from "@/lib/forms/address/postal-code"
import { normalizeCountryCode } from "@/lib/forms/country-options"
import type { AuthRegisterInput } from "@/lib/storefront/auth"

type BuildAuthRegisterInputOptions = {
  currencyCode: string
}

const trimValue = (value: string) => value.trim()

const normalizeRegisterPostalCode = (values: RegisterFormValues) =>
  formatPostalCodeForCountry(
    values.billing_postal_code,
    values.billing_country_code
  ) ?? trimValue(values.billing_postal_code)

export const buildAuthRegisterInput = (
  values: RegisterFormValues,
  { currencyCode }: BuildAuthRegisterInputOptions
): AuthRegisterInput => ({
  email: values.email,
  password: values.password,
  first_name: values.first_name,
  last_name: values.last_name,
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
            postal_code: normalizeRegisterPostalCode(values),
            country_code:
              normalizeCountryCode(values.billing_country_code) ??
              trimValue(values.billing_country_code),
          },
        },
      }
    : {}),
})

import { createAddressFieldValidators } from "@/lib/forms/validators/address"
import {
  createChangeBlurFieldValidators,
  createChangeBlurSubmitScopedFieldValidators,
} from "@/lib/forms/validators/field-validator-factories"
import { validateRequiredAgreement } from "@/lib/forms/validators/shared"
import type { HerbatikaMarketContext } from "@/lib/storefront/market-context"

import type {
  AuthValidationMessages,
  RegisterFormValues,
} from "./auth-validation-types"
import {
  createPasswordConfirmationFieldValidators,
  createPasswordValidator,
} from "./password-form-validators"

export const isWholesaleRegistration = (values: RegisterFormValues) =>
  values.account_type === "wholesale"

export const createRegisterValidators = (
  messages: AuthValidationMessages,
  countryCode: HerbatikaMarketContext["countryCode"],
) => {
  const address = createAddressFieldValidators(messages, countryCode)
  const createWholesaleValidator = (
    validator: (value: string) => string | undefined,
  ) =>
    createChangeBlurSubmitScopedFieldValidators(
      validator,
      isWholesaleRegistration,
    )

  return {
    accept_terms: createChangeBlurFieldValidators((value: boolean) =>
      validateRequiredAgreement(value, messages.termsRequired),
    ),
    account_type: createChangeBlurFieldValidators((value: string) =>
      value === "retail" || value === "wholesale"
        ? undefined
        : messages.accountTypeRequired,
    ),
    billing_address_1: createWholesaleValidator(address.address1),
    billing_city: createWholesaleValidator(address.city),
    billing_country_code: createWholesaleValidator(address.countryCode),
    billing_postal_code: createWholesaleValidator(address.postalCode),
    company_identifier: createWholesaleValidator(address.companyId),
    company_name: createWholesaleValidator(address.company),
    confirm_password: createPasswordConfirmationFieldValidators(messages),
    email: createChangeBlurFieldValidators(address.email),
    first_name: createChangeBlurFieldValidators(address.firstName),
    last_name: createChangeBlurFieldValidators(address.lastName),
    password: createChangeBlurFieldValidators(
      createPasswordValidator(messages),
    ),
  }
}

export type RegisterFormValidators = ReturnType<typeof createRegisterValidators>

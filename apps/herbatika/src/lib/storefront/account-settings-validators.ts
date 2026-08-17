import type { HttpTypes } from "@medusajs/types"
import { createOptionalPhoneNumberValidator } from "@/lib/forms/phone-number"
import {
  createChangeBlurFieldValidators,
  createChangeBlurSubmitFieldValidators,
} from "@/lib/forms/validators/field-validator-factories"
import { createCustomerNameValidator } from "@/lib/forms/validators/shared"

export type AccountSettingsValues = {
  first_name: string
  last_name: string
  phone: string
  company_name: string
}

type AccountSettingsValidationMessages = {
  firstNameMinLength: string
  lastNameMinLength: string
  phoneInvalid: string
}

export const createAccountSettingsValidators = (
  messages: AccountSettingsValidationMessages,
  countryCode: string
) => ({
  first_name: createChangeBlurFieldValidators(
    createCustomerNameValidator(messages.firstNameMinLength)
  ),
  last_name: createChangeBlurFieldValidators(
    createCustomerNameValidator(messages.lastNameMinLength)
  ),
  phone: createChangeBlurSubmitFieldValidators(
    createOptionalPhoneNumberValidator(messages.phoneInvalid, countryCode)
  ),
})

export const toAccountSettingsValues = (
  customer: HttpTypes.StoreCustomer | null | undefined
): AccountSettingsValues => ({
  first_name: customer?.first_name ?? "",
  last_name: customer?.last_name ?? "",
  phone: customer?.phone ?? "",
  company_name:
    (customer as unknown as { company_name?: string | null })?.company_name ??
    "",
})

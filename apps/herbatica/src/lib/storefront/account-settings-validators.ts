import type { HttpTypes } from "@medusajs/types"
import { createChangeBlurFieldValidators } from "@/lib/forms/validators/field-validator-factories"
import {
  createCustomerNameValidator,
  createOptionalPhoneNumberValidator,
} from "@/lib/forms/validators/shared"

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
  phoneMinDigits: string
}

export const createAccountSettingsValidators = (
  messages: AccountSettingsValidationMessages
) => ({
  first_name: createChangeBlurFieldValidators(
    createCustomerNameValidator(messages.firstNameMinLength)
  ),
  last_name: createChangeBlurFieldValidators(
    createCustomerNameValidator(messages.lastNameMinLength)
  ),
  phone: createChangeBlurFieldValidators(
    createOptionalPhoneNumberValidator({
      invalid: messages.phoneInvalid,
      minDigits: messages.phoneMinDigits,
    })
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

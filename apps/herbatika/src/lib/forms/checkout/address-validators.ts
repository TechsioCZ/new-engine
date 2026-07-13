import type { CheckoutDetailsValues } from "@/lib/forms/checkout/address.form"
import {
  addressFieldValidators,
  createAddressFieldValidators,
  type AddressValidationMessages,
} from "@/lib/forms/validators/address"
import { DEFAULT_ADDRESS_VALIDATION_MESSAGES } from "@/lib/forms/validators/address-validation-messages"
import { createChangeBlurSubmitScopedFieldValidators } from "@/lib/forms/validators/field-validator-factories"

export type CheckoutAddressValidationMessages = AddressValidationMessages
export const checkoutAddressFieldValidators = addressFieldValidators

const validateBillingFields = (values: CheckoutDetailsValues) =>
  !values.useSameAddress

const validateShippingCompanyFields = (values: CheckoutDetailsValues) =>
  values.useSameAddress && values.isCompanyPurchase

const validateBillingCompanyFields = (values: CheckoutDetailsValues) =>
  !values.useSameAddress && values.isCompanyPurchase

export const createCheckoutFieldValidators = (
  messages: CheckoutAddressValidationMessages
) => {
  const validators = createAddressFieldValidators(messages)

  const shipping = {
    address1: createChangeBlurSubmitScopedFieldValidators(validators.address1),
    city: createChangeBlurSubmitScopedFieldValidators(validators.city),
    company: createChangeBlurSubmitScopedFieldValidators(
      validators.company,
      validateShippingCompanyFields
    ),
    companyId: createChangeBlurSubmitScopedFieldValidators(
      validators.companyId,
      validateShippingCompanyFields
    ),
    countryCode: createChangeBlurSubmitScopedFieldValidators(
      validators.countryCode
    ),
    email: createChangeBlurSubmitScopedFieldValidators(validators.email),
    firstName: createChangeBlurSubmitScopedFieldValidators(
      validators.firstName
    ),
    lastName: createChangeBlurSubmitScopedFieldValidators(validators.lastName),
    phone: createChangeBlurSubmitScopedFieldValidators(validators.phone),
    postalCode: createChangeBlurSubmitScopedFieldValidators(
      validators.postalCode
    ),
    taxId: createChangeBlurSubmitScopedFieldValidators(
      validators.taxId,
      validateShippingCompanyFields
    ),
  }

  const billing = {
    address1: createChangeBlurSubmitScopedFieldValidators(
      validators.address1,
      validateBillingFields
    ),
    city: createChangeBlurSubmitScopedFieldValidators(
      validators.city,
      validateBillingFields
    ),
    company: createChangeBlurSubmitScopedFieldValidators(
      validators.company,
      validateBillingCompanyFields
    ),
    companyId: createChangeBlurSubmitScopedFieldValidators(
      validators.companyId,
      validateBillingCompanyFields
    ),
    countryCode: createChangeBlurSubmitScopedFieldValidators(
      validators.countryCode,
      validateBillingFields
    ),
    firstName: createChangeBlurSubmitScopedFieldValidators(
      validators.firstName,
      validateBillingFields
    ),
    lastName: createChangeBlurSubmitScopedFieldValidators(
      validators.lastName,
      validateBillingFields
    ),
    postalCode: createChangeBlurSubmitScopedFieldValidators(
      validators.postalCode,
      validateBillingFields
    ),
    taxId: createChangeBlurSubmitScopedFieldValidators(
      validators.taxId,
      validateBillingCompanyFields
    ),
  }

  return { billing, shipping }
}

export const checkoutFieldValidators = createCheckoutFieldValidators(
  DEFAULT_ADDRESS_VALIDATION_MESSAGES
)

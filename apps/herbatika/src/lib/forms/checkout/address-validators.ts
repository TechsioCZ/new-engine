import type { CheckoutDetailsValues } from "@/lib/forms/checkout/address.form"
import {
  type AddressValidationMessages,
  createAddressFieldValidators,
} from "@/lib/forms/validators/address"
import { createChangeBlurSubmitScopedFieldValidators } from "@/lib/forms/validators/field-validator-factories"
import type { HerbatikaCountryCode } from "@/lib/storefront/market-context"

export type CheckoutAddressValidationMessages = AddressValidationMessages

const validateBillingFields = (values: CheckoutDetailsValues) =>
  !values.useSameAddress

const validateShippingCompanyFields = (values: CheckoutDetailsValues) =>
  values.useSameAddress && values.isCompanyPurchase

const validateBillingCompanyFields = (values: CheckoutDetailsValues) =>
  !values.useSameAddress && values.isCompanyPurchase

export const createCheckoutFieldValidators = (
  messages: CheckoutAddressValidationMessages,
  countryCode: HerbatikaCountryCode
) => {
  const validators = createAddressFieldValidators(messages, countryCode)

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

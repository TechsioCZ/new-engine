#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

const readText = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8")

const assertIncludes = (content, expected, label) => {
  if (!content.includes(expected)) {
    throw new Error(`${label}: missing ${expected}`)
  }
}

const assertMatches = (content, pattern, label) => {
  if (!pattern.test(content)) {
    throw new Error(`${label}: missing ${pattern}`)
  }
}

const checkoutAddressSection = readText(
  "src/components/checkout/sections/checkout-address-section.tsx"
)
const smartSuggestAddressField = readText(
  "src/components/forms/form-smart-suggest-address-field.tsx"
)
const addressValidators = readText(
  "src/lib/forms/checkout/address-validators.ts"
)
const phoneField = readText("src/components/forms/form-phone-field.tsx")
const smartSuggestClient = readText("src/lib/smart-suggest/client.ts")
const smartSuggestUiAddress = readText(
  "../../libs/smart-suggest/ui/src/address-suggest-field.tsx"
)
const vanillaSdkDocs = readText("../../libs/smart-suggest/vanilla/README.md")

assertIncludes(
  checkoutAddressSection,
  "FormSmartSuggestAddressField",
  "checkout address section uses the Smart Suggest address wrapper"
)
assertMatches(
  checkoutAddressSection,
  /onAddressSelect=\{applySelectedAddress\}/,
  "checkout address selection fills structured address fields"
)
assertIncludes(
  checkoutAddressSection,
  "formatSelectedAddressLine(address)",
  "checkout address selection falls back when line1 is blank"
)
assertIncludes(
  checkoutAddressSection,
  'autoComplete="country"',
  "checkout country field preserves browser autocomplete"
)
assertIncludes(
  checkoutAddressSection,
  'autoComplete="address-level2"',
  "checkout city field preserves browser autocomplete"
)
assertIncludes(
  checkoutAddressSection,
  'autoComplete="postal-code"',
  "checkout postal field preserves browser autocomplete"
)
assertIncludes(
  phoneField,
  'autoComplete="tel"',
  "checkout phone field preserves telephone autocomplete"
)
assertIncludes(
  smartSuggestAddressField,
  "@techsio/smart-suggest-ui/address-suggest-field",
  "Herbatika imports the direct Smart Suggest UI subpath"
)
assertIncludes(
  smartSuggestAddressField,
  'autoComplete="address-line1"',
  "Smart Suggest wrapper preserves address-line1 autocomplete"
)
assertIncludes(
  smartSuggestAddressField,
  "normalizedCountryCode",
  "Smart Suggest wrapper normalizes blank country codes to undefined"
)
assertIncludes(
  smartSuggestAddressField,
  ": undefined",
  "Smart Suggest wrapper omits blank country codes"
)
assertIncludes(
  smartSuggestAddressField,
  "field.handleChange(nextValue)",
  "manual address typing updates the checkout form"
)
assertIncludes(
  smartSuggestAddressField,
  "client={herbatikaSmartSuggestClient}",
  "checkout uses the Herbatika Smart Suggest client"
)
assertIncludes(
  smartSuggestAddressField,
  "onAddressSelect?.(address)",
  "selected suggestions are forwarded to checkout"
)
assertIncludes(
  smartSuggestUiAddress,
  "allowCustomValue",
  "Smart Suggest address UI fails open to manual entry"
)
assertIncludes(
  smartSuggestUiAddress,
  ".accept({",
  "Smart Suggest address UI sends accept telemetry on selection"
)
assertIncludes(
  addressValidators,
  "validatePhoneNumber",
  "checkout phone validation uses Smart Suggest validation"
)
assertIncludes(
  addressValidators,
  "validateSmartSuggestPostalCode",
  "checkout postal validation uses Smart Suggest validation"
)
assertIncludes(
  addressValidators,
  'createCheckoutPostalCodeValidators("shipping")',
  "shipping postal validation uses the selected shipping country"
)
assertIncludes(
  addressValidators,
  'createCheckoutPostalCodeValidators("billing", validateBillingFields)',
  "billing postal validation uses the selected billing country"
)
assertIncludes(
  smartSuggestClient,
  "createSmartSuggestClient",
  "Herbatika creates a typed Smart Suggest API client"
)
assertIncludes(
  vanillaSdkDocs,
  'autocomplete="address-line1"',
  "old-core SDK docs document address autocomplete"
)
assertIncludes(
  vanillaSdkDocs,
  'autocomplete="tel"',
  "old-core SDK docs document telephone autocomplete"
)

console.log("Smart Suggest checkout integration checks passed")

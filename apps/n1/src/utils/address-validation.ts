import { VALIDATION_MESSAGES } from "@/lib/validation-messages"

export type AddressFormData = {
  first_name: string
  last_name: string
  company?: string
  address_1: string
  address_2?: string
  city: string
  province?: string
  postal_code: string
  country_code: string
  phone?: string
}

export type AddressFieldKey = keyof AddressFormData
export type AddressErrors = Partial<Record<AddressFieldKey, string>>
export type AddressPatchData = Partial<AddressFormData>

const ADDRESS_VALIDATION_RULES = {
  first_name: {
    required: VALIDATION_MESSAGES.firstName.required,
    minLength: { value: 2, message: VALIDATION_MESSAGES.firstName.minLength },
  },
  last_name: {
    required: VALIDATION_MESSAGES.lastName.required,
    minLength: { value: 2, message: VALIDATION_MESSAGES.lastName.minLength },
  },
  address_1: {
    required: VALIDATION_MESSAGES.address.required,
    minLength: { value: 3, message: VALIDATION_MESSAGES.address.minLength },
  },
  city: {
    required: VALIDATION_MESSAGES.city.required,
    minLength: { value: 2, message: VALIDATION_MESSAGES.city.minLength },
  },
  postal_code: {
    required: VALIDATION_MESSAGES.postalCode.required,
    pattern: {
      value: /^\d{3}\s\d{2}$/,
      message: VALIDATION_MESSAGES.postalCode.invalid,
    },
  },
  country_code: {
    required: VALIDATION_MESSAGES.country.required,
  },
  phone: {
    pattern: {
      value: /^(\+420\s)?\d{3}\s\d{3}\s\d{3}$|^$/,
      message: VALIDATION_MESSAGES.phone.invalid,
    },
  },
} as const

const REQUIRED_ADDRESS_FIELDS = [
  "first_name",
  "last_name",
  "address_1",
  "city",
  "postal_code",
  "country_code",
] as const satisfies readonly AddressFieldKey[]

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: switch-based validation rules
function validateAddressField(
  field: AddressFieldKey,
  value: string,
  _countryCode?: string
): string | undefined {
  switch (field) {
    case "first_name": {
      if (!value.trim()) {
        return ADDRESS_VALIDATION_RULES.first_name.required
      }
      if (value.length < ADDRESS_VALIDATION_RULES.first_name.minLength.value) {
        return ADDRESS_VALIDATION_RULES.first_name.minLength.message
      }
      break
    }
    case "last_name": {
      if (!value.trim()) {
        return ADDRESS_VALIDATION_RULES.last_name.required
      }
      if (value.length < ADDRESS_VALIDATION_RULES.last_name.minLength.value) {
        return ADDRESS_VALIDATION_RULES.last_name.minLength.message
      }
      break
    }
    case "address_1": {
      if (!value.trim()) {
        return ADDRESS_VALIDATION_RULES.address_1.required
      }
      if (value.length < ADDRESS_VALIDATION_RULES.address_1.minLength.value) {
        return ADDRESS_VALIDATION_RULES.address_1.minLength.message
      }
      break
    }
    case "city": {
      if (!value.trim()) {
        return ADDRESS_VALIDATION_RULES.city.required
      }
      if (value.length < ADDRESS_VALIDATION_RULES.city.minLength.value) {
        return ADDRESS_VALIDATION_RULES.city.minLength.message
      }
      break
    }
    case "country_code": {
      if (!value.trim()) {
        return ADDRESS_VALIDATION_RULES.country_code.required
      }
      break
    }
    case "postal_code": {
      if (!value.trim()) {
        return ADDRESS_VALIDATION_RULES.postal_code.required
      }
      if (!ADDRESS_VALIDATION_RULES.postal_code.pattern.value.test(value)) {
        return ADDRESS_VALIDATION_RULES.postal_code.pattern.message
      }
      break
    }
    case "phone": {
      if (value && !ADDRESS_VALIDATION_RULES.phone.pattern.value.test(value)) {
        return ADDRESS_VALIDATION_RULES.phone.pattern.message
      }
      break
    }
    case "company":
    case "address_2":
    case "province":
      break

    default:
      break
  }
  return
}

export function validateAddressForm(data: AddressFormData): AddressErrors {
  const errors: AddressErrors = {}

  for (const field of REQUIRED_ADDRESS_FIELDS) {
    const fieldValue = data[field] || ""
    const error = validateAddressField(field, fieldValue, data.country_code)
    if (error) {
      errors[field] = error
    }
  }

  if (data.phone) {
    const phoneError = validateAddressField("phone", data.phone)
    if (phoneError) {
      errors.phone = phoneError
    }
  }

  return errors
}

export function validateAddressPatch(data: AddressPatchData): AddressErrors {
  const errors: AddressErrors = {}

  for (const field of REQUIRED_ADDRESS_FIELDS) {
    if (!Object.hasOwn(data, field)) {
      continue
    }

    const fieldValue = data[field] || ""
    const error = validateAddressField(field, fieldValue, data.country_code)
    if (error) {
      errors[field] = error
    }
  }

  if (Object.hasOwn(data, "phone")) {
    const phoneError = validateAddressField("phone", data.phone || "")
    if (phoneError) {
      errors.phone = phoneError
    }
  }

  return errors
}

import { AUTH_MESSAGES } from "./auth-messages"
import { VALIDATION_MESSAGES } from "./validation-messages"

const PHONE_REGEX = /^(\+420\s)?\d{3}\s\d{3}\s\d{3}$|^$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_NUMBER_REGEX = /\d/
const POSTAL_CODE_REGEX = /^\d{3}\s\d{2}$/

type ConfirmPasswordFieldApi = {
  form: {
    getFieldValue: (fieldName: RegisterFieldName) => unknown
  }
}

type RegisterFieldName =
  | "first_name"
  | "last_name"
  | "email"
  | "password"
  | "confirmPassword"
  | "acceptTerms"

// ============================================================================
// SHARED FIELD VALIDATORS - Single Source of Truth
// ============================================================================

/**
 * Creates firstName validator with consistent rules across all forms.
 * Rules: required, minLength(2)
 * Used in: AddressFormDialog, RegisterForm, ProfileForm
 */
const createFirstNameValidator = () => ({
  onChange: ({ value }: { value: string }) => {
    if (!value?.trim()) {
      return VALIDATION_MESSAGES.firstName.required
    }
    if (value.length < 2) {
      return VALIDATION_MESSAGES.firstName.minLength
    }
    return
  },
})

/**
 * Creates lastName validator with consistent rules across all forms.
 * Rules: required, minLength(2)
 * Used in: AddressFormDialog, RegisterForm, ProfileForm
 */
const createLastNameValidator = () => ({
  onChange: ({ value }: { value: string }) => {
    if (!value?.trim()) {
      return VALIDATION_MESSAGES.lastName.required
    }
    if (value.length < 2) {
      return VALIDATION_MESSAGES.lastName.minLength
    }
    return
  },
})

/**
 * Creates phone validator with consistent rules across all forms.
 * Rules: optional, Czech phone format (+420 XXX XXX XXX or XXX XXX XXX)
 * Used in: AddressFormDialog, ProfileForm
 */
const createPhoneValidator = () => ({
  onChange: ({ value }: { value: string | undefined }) => {
    if (!value) {
      return // Optional field
    }
    if (!PHONE_REGEX.test(value)) {
      return VALIDATION_MESSAGES.phone.invalid
    }
    return
  },
})

/**
 * Creates confirmPassword validator that checks password match.
 * Rules: required, must match password field
 * Used in: RegisterForm
 */
const createConfirmPasswordValidator = () => ({
  onChangeListenTo: ["password"] as RegisterFieldName[],
  onChange: ({
    value,
    fieldApi,
  }: {
    value: string
    fieldApi: ConfirmPasswordFieldApi
  }) => {
    if (!value) {
      return VALIDATION_MESSAGES.password.confirmRequired
    }
    const passwordValue = fieldApi.form.getFieldValue("password") as
      | string
      | undefined
    if (value !== passwordValue) {
      return VALIDATION_MESSAGES.password.mismatch
    }
    return
  },
})

// ============================================================================
// STANDALONE VALIDATORS
// ============================================================================

export const emailValidator = {
  onChange: ({ value }: { value: string | undefined }) => {
    if (!value?.trim()) {
      return VALIDATION_MESSAGES.email.required
    }
    if (!EMAIL_REGEX.test(value)) {
      return VALIDATION_MESSAGES.email.invalid
    }
    return
  },
} as const

const loginPasswordValidator = {
  onSubmit: ({ value }: { value: string }) => {
    if (!value?.trim()) {
      return VALIDATION_MESSAGES.password.required
    }
    // No further validation - backend will return generic error
    return
  },
} as const

// ============================================================================
// PASSWORD STRENGTH VALIDATION
// ============================================================================

export const PASSWORD_REQUIREMENTS = [
  {
    id: "min-length",
    label: AUTH_MESSAGES.PASSWORD_REQUIREMENT_LENGTH,
    test: (pwd: string) => pwd.length >= 8,
  },
  {
    id: "has-number",
    label: AUTH_MESSAGES.PASSWORD_REQUIREMENT_NUMBER,
    test: (pwd: string) => PASSWORD_NUMBER_REGEX.test(pwd),
  },
]

const isPasswordValid = (password: string): boolean =>
  PASSWORD_REQUIREMENTS.every((req) => req.test(password))

// ============================================================================
// FORM-SPECIFIC VALIDATORS
// ============================================================================

/**
 * Login form validators
 * - email: onChange validation (required, format)
 * - password: onSubmit validation (required only, no strength check)
 */
export const loginValidators = {
  email: emailValidator,
  password: loginPasswordValidator,
} as const

/**
 * Address form validators (AddressFormDialog)
 * Uses shared validators for name and phone fields
 */
export const addressValidators = {
  first_name: createFirstNameValidator(),
  last_name: createLastNameValidator(),
  address_1: {
    onChange: ({ value }: { value: string }) => {
      if (!value?.trim()) {
        return VALIDATION_MESSAGES.address.required
      }
      if (value.length < 3) {
        return VALIDATION_MESSAGES.address.minLength
      }
      return
    },
  },
  city: {
    onChange: ({ value }: { value: string }) => {
      if (!value?.trim()) {
        return VALIDATION_MESSAGES.city.required
      }
      if (value.length < 2) {
        return VALIDATION_MESSAGES.city.minLength
      }
      return
    },
  },
  postal_code: {
    onChange: ({ value }: { value: string }) => {
      if (!value?.trim()) {
        return VALIDATION_MESSAGES.postalCode.required
      }
      if (!POSTAL_CODE_REGEX.test(value)) {
        return VALIDATION_MESSAGES.postalCode.invalid
      }
      return
    },
  },
  country_code: {
    onChange: ({ value }: { value: string }) => {
      if (!value?.trim()) {
        return VALIDATION_MESSAGES.country.required
      }
      return
    },
  },
  phone: createPhoneValidator(),
  company: {},
  address_2: {},
  province: {},
} as const

/**
 * Register form validators
 * Uses shared validators for name fields and email
 * Includes password strength validation and confirmPassword
 */
export const registerValidators = {
  first_name: createFirstNameValidator(),
  last_name: createLastNameValidator(),
  email: emailValidator,
  password: {
    onChange: ({ value }: { value: string }) => {
      if (!value?.trim()) {
        return VALIDATION_MESSAGES.password.required
      }
      if (!isPasswordValid(value)) {
        return VALIDATION_MESSAGES.password.invalid
      }
      return
    },
  },
  confirmPassword: createConfirmPasswordValidator(),
  acceptTerms: {
    onChange: ({ value }: { value: boolean }) => {
      if (!value) {
        return VALIDATION_MESSAGES.terms.required
      }
      return
    },
  },
} as const

/**
 * Profile form validators
 * Uses shared validators for name and phone fields
 */
export const profileValidators = {
  first_name: createFirstNameValidator(),
  last_name: createLastNameValidator(),
  phone: createPhoneValidator(),
} as const

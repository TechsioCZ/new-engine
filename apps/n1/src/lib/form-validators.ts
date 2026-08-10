import { AUTH_MESSAGES } from "./auth-messages"
import { VALIDATION_MESSAGES } from "./validation-messages"

const PHONE_REGEX = /^(?:\+420\s)?\d{3}\s\d{3}\s\d{3}$/u
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u
const PASSWORD_NUMBER_REGEX = /\d/u
const POSTAL_CODE_REGEX = /^\d{3}\s\d{2}$/u

interface ConfirmPasswordFieldApi {
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

type ValidationMessage = string | undefined

// ============================================================================
// SHARED FIELD VALIDATORS - Single Source of Truth
// ============================================================================

/**
 * Creates firstName validator with consistent rules across all forms.
 * Rules: required, minLength(2)
 * Used in: AddressFormDialog, RegisterForm, ProfileForm
 */
const createFirstNameValidator = () => ({
  onChange: ({ value }: { value: string }): ValidationMessage => {
    let message: ValidationMessage
    if (!value.trim()) {
      message = VALIDATION_MESSAGES.firstName.required
    } else if (value.length < 2) {
      message = VALIDATION_MESSAGES.firstName.minLength
    }
    return message
  },
})

/**
 * Creates lastName validator with consistent rules across all forms.
 * Rules: required, minLength(2)
 * Used in: AddressFormDialog, RegisterForm, ProfileForm
 */
const createLastNameValidator = () => ({
  onChange: ({ value }: { value: string }): ValidationMessage => {
    let message: ValidationMessage
    if (!value.trim()) {
      message = VALIDATION_MESSAGES.lastName.required
    } else if (value.length < 2) {
      message = VALIDATION_MESSAGES.lastName.minLength
    }
    return message
  },
})

/**
 * Creates phone validator with consistent rules across all forms.
 * Rules: optional, Czech phone format (+420 XXX XXX XXX or XXX XXX XXX)
 * Used in: AddressFormDialog, ProfileForm
 */
const createPhoneValidator = () => ({
  onChange: ({ value }: { value: string | undefined }): ValidationMessage => {
    let message: ValidationMessage
    if (value !== undefined && value !== "" && !PHONE_REGEX.test(value)) {
      message = VALIDATION_MESSAGES.phone.invalid
    }
    return message
  },
})

/**
 * Creates confirmPassword validator that checks password match.
 * Rules: required, must match password field
 * Used in: RegisterForm
 */
const createConfirmPasswordValidator = () => ({
  onChange: ({
    value,
    fieldApi,
  }: {
    value: string
    fieldApi: ConfirmPasswordFieldApi
  }): ValidationMessage => {
    let message: ValidationMessage
    if (value === "") {
      message = VALIDATION_MESSAGES.password.confirmRequired
    } else {
      const passwordValue = fieldApi.form.getFieldValue("password")
      if (typeof passwordValue !== "string" || value !== passwordValue) {
        message = VALIDATION_MESSAGES.password.mismatch
      }
    }
    return message
  },
  onChangeListenTo: ["password"] as RegisterFieldName[],
})

// ============================================================================
// STANDALONE VALIDATORS
// ============================================================================

export const emailValidator = {
  onChange: ({ value }: { value: string | undefined }): ValidationMessage => {
    let message: ValidationMessage
    if (value === undefined || !value.trim()) {
      message = VALIDATION_MESSAGES.email.required
    } else if (!EMAIL_REGEX.test(value)) {
      message = VALIDATION_MESSAGES.email.invalid
    }
    return message
  },
} as const

const loginPasswordValidator = {
  onSubmit: ({ value }: { value: string }): ValidationMessage => {
    let message: ValidationMessage
    if (!value.trim()) {
      message = VALIDATION_MESSAGES.password.required
    }
    return message
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
  PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(password))

// ============================================================================
// FORM-SPECIFIC VALIDATORS
// ============================================================================

/** Login form validators. */
export const loginValidators = {
  email: emailValidator,
  password: loginPasswordValidator,
} as const

/** Address form validators. */
export const addressValidators = {
  address_1: {
    onChange: ({ value }: { value: string }): ValidationMessage => {
      let message: ValidationMessage
      if (!value.trim()) {
        message = VALIDATION_MESSAGES.address.required
      } else if (value.length < 3) {
        message = VALIDATION_MESSAGES.address.minLength
      }
      return message
    },
  },
  address_2: {},
  city: {
    onChange: ({ value }: { value: string }): ValidationMessage => {
      let message: ValidationMessage
      if (!value.trim()) {
        message = VALIDATION_MESSAGES.city.required
      } else if (value.length < 2) {
        message = VALIDATION_MESSAGES.city.minLength
      }
      return message
    },
  },
  company: {},
  country_code: {
    onChange: ({ value }: { value: string }): ValidationMessage => {
      let message: ValidationMessage
      if (!value.trim()) {
        message = VALIDATION_MESSAGES.country.required
      }
      return message
    },
  },
  first_name: createFirstNameValidator(),
  last_name: createLastNameValidator(),
  phone: createPhoneValidator(),
  postal_code: {
    onChange: ({ value }: { value: string }): ValidationMessage => {
      let message: ValidationMessage
      if (!value.trim()) {
        message = VALIDATION_MESSAGES.postalCode.required
      } else if (!POSTAL_CODE_REGEX.test(value)) {
        message = VALIDATION_MESSAGES.postalCode.invalid
      }
      return message
    },
  },
  province: {},
} as const

/** Register form validators. */
export const registerValidators = {
  acceptTerms: {
    onChange: ({ value }: { value: boolean }): ValidationMessage => {
      let message: ValidationMessage
      if (!value) {
        message = VALIDATION_MESSAGES.terms.required
      }
      return message
    },
  },
  confirmPassword: createConfirmPasswordValidator(),
  email: emailValidator,
  first_name: createFirstNameValidator(),
  last_name: createLastNameValidator(),
  password: {
    onChange: ({ value }: { value: string }): ValidationMessage => {
      let message: ValidationMessage
      if (!value.trim()) {
        message = VALIDATION_MESSAGES.password.required
      } else if (!isPasswordValid(value)) {
        message = VALIDATION_MESSAGES.password.invalid
      }
      return message
    },
  },
} as const

/** Profile form validators. */
export const profileValidators = {
  first_name: createFirstNameValidator(),
  last_name: createLastNameValidator(),
  phone: createPhoneValidator(),
} as const

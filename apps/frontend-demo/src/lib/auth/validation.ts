/**
 * Email validation
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Password validation rules
 */
interface PasswordRequirements {
  length: boolean
  uppercase: boolean
  lowercase: boolean
  number: boolean
}

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  requirements: PasswordRequirements
  strength: number
}

export const validatePassword = (
  password: string
): PasswordValidationResult => {
  const requirements: PasswordRequirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  }

  const errors: string[] = []
  if (!requirements.length) {
    errors.push("Password must be at least 8 characters long")
  }
  if (!requirements.uppercase) {
    errors.push("Password must contain at least one uppercase letter")
  }
  if (!requirements.lowercase) {
    errors.push("Password must contain at least one lowercase letter")
  }
  if (!requirements.number) {
    errors.push("Password must contain at least one number")
  }

  const strength = Object.values(requirements).filter(Boolean).length
  const isValid = strength === 4

  return {
    isValid,
    errors,
    requirements,
    strength,
  }
}

/**
 * Validation error type
 */
export interface ValidationError {
  field: string
  message: string
}

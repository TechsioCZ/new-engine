import { AUTH_ERRORS } from "./constants"

/**
 * Maps error messages to user-friendly messages
 */
export const getAuthErrorMessage = (error: unknown): string => {
  let message = ""
  if (typeof error === "object" && error !== null && "message" in error) {
    const candidateMessage = error.message
    if (typeof candidateMessage === "string") {
      message = candidateMessage
    }
  }

  // Email validation errors
  if (message.includes("Invalid email")) {
    return AUTH_ERRORS.INVALID_EMAIL
  }

  // Credential errors
  if (message.includes("Invalid credentials")) {
    return AUTH_ERRORS.INVALID_CREDENTIALS
  }

  // User not found
  if (message.includes("not found")) {
    return AUTH_ERRORS.USER_NOT_FOUND
  }

  // User already exists
  if (message.includes("already exists")) {
    return AUTH_ERRORS.USER_EXISTS
  }

  // Return original message if it's specific enough
  if (message.length > 0 && !message.includes("Error:")) {
    return message
  }

  // Default error
  return AUTH_ERRORS.GENERIC_ERROR
}

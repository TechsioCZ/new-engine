/**
 * Maps English error messages from Medusa SDK to Czech user-friendly messages
 */
export function mapAuthError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase()

  // Invalid credentials (login)
  if (
    message.includes("invalid") ||
    message.includes("credentials") ||
    message.includes("unauthorized")
  ) {
    return AUTH_MESSAGES.INVALID_CREDENTIALS
  }

  // Email already exists (register)
  if (message.includes("already exists") || message.includes("duplicate")) {
    return AUTH_MESSAGES.EMAIL_EXISTS
  }

  // Network/connection errors
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("econnrefused")
  ) {
    return AUTH_MESSAGES.NETWORK_ERROR
  }

  // Server errors (5xx)
  if (message.includes("server") || message.includes("500")) {
    return AUTH_MESSAGES.SERVER_ERROR
  }

  // Multi-step auth not supported
  if (message.includes("multi-step")) {
    return AUTH_MESSAGES.MULTI_STEP_NOT_SUPPORTED
  }

  // Default fallback
  return AUTH_MESSAGES.SERVER_ERROR
}

export const AUTH_MESSAGES = {
  CUSTOMER_FETCH_FAILED: "Nepodařilo se načíst údaje zákazníka",
  CUSTOMER_UPDATE_FAILED: "Nepodařilo se aktualizovat údaje zákazníka",
  CUSTOMER_UPDATE_SUCCESS: "Údaje zákazníka byly aktualizovány",
  EMAIL_EXISTS: "Email již existuje. Zkuste se přihlásit.",
  EMAIL_REQUIRED: "Zadejte platnou e-mailovou adresu",
  FIRST_NAME_REQUIRED: "Vyplňte prosím jméno",
  INVALID_CREDENTIALS: "Nesprávný email nebo heslo",
  LAST_NAME_REQUIRED: "Vyplňte prosím příjmení",
  LOGIN_FAILED: "Přihlášení se nezdařilo",
  LOGIN_SUCCESS: "Úspěšně přihlášen",
  LOGOUT_FAILED: "Odhlášení se nezdařilo",
  LOGOUT_SUCCESS: "Odhlášení proběhlo úspěšně",
  MULTI_STEP_NOT_SUPPORTED:
    "Multi-step authentication is not supported in the current implementation",
  NETWORK_ERROR: "Chyba připojení k serveru",
  PASSWORDS_DONT_MATCH: "Hesla se neshodují",
  PASSWORDS_MATCH: "Hesla se shodují",
  PASSWORD_ALL_REQUIREMENTS_MET: "Heslo splňuje všechny požadavky",
  PASSWORD_MUST_HAVE_NUMBER: "Heslo musí obsahovat alespoň 1 číslici",
  PASSWORD_REQUIRED: "Zadejte heslo",
  PASSWORD_REQUIREMENTS_TITLE: "Požadavky na heslo:",
  PASSWORD_REQUIREMENT_LENGTH: "Alespoň 8 znaků",
  PASSWORD_REQUIREMENT_NUMBER: "Alespoň 1 číslice",
  PASSWORD_TOO_SHORT: "Heslo musí mít alespoň 8 znaků",
  REGISTER_FAILED: "Registrace se nezdařila",
  REGISTER_SUCCESS: "Registrace proběhla úspěšně",
  SERVER_ERROR: "Došlo k chybě serveru",
  TERMS_REQUIRED: "Musíte souhlasit s podmínkami",
  UNAUTHORIZED: "Nejste přihlášeni",
} as const

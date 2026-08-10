/**
 * Auth-related constants and configurations
 */

export const AUTH_ERRORS = {
  GENERIC_ERROR: "Došlo k chybě. Zkuste to prosím znovu.",
  INVALID_CREDENTIALS: "Neplatný e-mail nebo heslo",
  INVALID_EMAIL: "Zadejte prosím platnou e-mailovou adresu",
  PASSWORD_MISMATCH: "Hesla se neshodují",
  PASSWORD_REQUIRED: "Zadejte prosím své heslo",
  TERMS_REQUIRED: "Musíte přijmout obchodní podmínky",
  USER_EXISTS: "Účet s tímto e-mailem již existuje",
  USER_NOT_FOUND: "S tímto e-mailem nebyl nalezen žádný účet",
} as const

export const AUTH_MESSAGES = {
  LOGIN_ERROR: {
    title: "Přihlášení se nezdařilo",
  },
  LOGIN_SUCCESS: {
    description: "Úspěšně jste se přihlásili.",
    title: "Vítejte zpět!",
  },
  LOGOUT_SUCCESS: {
    description: "Úspěšně jste se odhlásili.",
    title: "Odhlášeno",
  },
  REGISTER_ERROR: {
    title: "Registrace se nezdařila",
  },
  REGISTER_SUCCESS: {
    description: "Byli jste automaticky přihlášeni.",
    title: "Účet vytvořen!",
  },
  UPDATE_ERROR: {
    title: "Aktualizace se nezdařila",
  },
  UPDATE_SUCCESS: {
    description: "Váš profil byl úspěšně aktualizován.",
    title: "Profil aktualizován",
  },
} as const

export const AUTH_FORM_CONFIG = {
  EMAIL_HELP_TEXT: "Použijte platný formát e-mailu (např. uzivatel@email.cz)",
  EMAIL_PLACEHOLDER: "uzivatel@email.cz",
  PASSWORD_HELP_TEXT: "Alespoň 8 znaků včetně velkých a malých písmen a čísel",
  PASSWORD_PLACEHOLDER: "••••••••",
} as const

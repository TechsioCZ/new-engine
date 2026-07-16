import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_AUTH_TEXT_DEFINITIONS = [
  {
    description: "Sdílený label akce pro přihlášení zákazníka.",
    key: "auth.sign_in",
    namespace: "auth",
    values: {
      cz: "Přihlásit se",
      hu: "Bejelentkezés",
      ro: "Autentificare",
      sk: "Prihlásiť sa",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]

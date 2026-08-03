import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_AUTH_LOGIN_TEXT_DEFINITIONS = [
  {
    description: "Krátký nadpis přihlášení v hlavičce.",
    key: "auth.login.short_title",
    namespace: "auth",
  },
  {
    description: "Nadpis přihlašovací stránky.",
    key: "auth.login.title",
    namespace: "auth",
  },
  {
    description: "Popis přihlašovacího formuláře.",
    key: "auth.login.description",
    namespace: "auth",
  },
  {
    description: "Odkaz na obnovu zapomenutého hesla.",
    key: "auth.login.forgot_password",
    namespace: "auth",
  },
  {
    description: "Text před odkazem na registraci.",
    key: "auth.login.no_account",
    namespace: "auth",
  },
  {
    description: "Odkaz na registraci zákazníka.",
    key: "auth.login.register_link",
    namespace: "auth",
  },
  {
    description: "Potvrzení úspěšného přihlášení.",
    key: "auth.login.success",
    namespace: "auth",
  },
  {
    description: "Chyba pro neplatné přihlašovací údaje.",
    key: "auth.login.invalid_credentials",
    namespace: "auth",
  },
  {
    description: "Obecná chyba přihlášení.",
    key: "auth.login.failed",
    namespace: "auth",
  },
] as const satisfies readonly StorefrontTextDefinition[]

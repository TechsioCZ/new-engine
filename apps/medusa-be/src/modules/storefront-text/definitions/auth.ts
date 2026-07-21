import type { StorefrontTextDefinition } from "../configuration"
import { STOREFRONT_AUTH_LOGIN_TEXT_DEFINITIONS } from "./auth-login"
import { STOREFRONT_AUTH_PASSWORD_TEXT_DEFINITIONS } from "./auth-password"
import { STOREFRONT_AUTH_REGISTER_TEXT_DEFINITIONS } from "./auth-register"

const STOREFRONT_AUTH_SHARED_TEXT_DEFINITIONS = [
  {
    description: "Přístupný název odkazu na zákaznický účet.",
    key: "auth.account_label",
    namespace: "auth",
  },
  {
    description: "Sdílený label akce pro přihlášení zákazníka.",
    key: "auth.sign_in",
    namespace: "auth",
  },
  {
    description: "Popisek pole pro heslo.",
    key: "auth.password",
    namespace: "auth",
  },
  {
    description: "Popisek pole pro potvrzení hesla.",
    key: "auth.password_confirmation",
    namespace: "auth",
  },
  {
    description: "Popisek pole pro nové heslo.",
    key: "auth.new_password",
    namespace: "auth",
  },
  {
    description: "Odkaz zpět na přihlašovací formulář.",
    key: "auth.back_to_login",
    namespace: "auth",
  },
  {
    description: "Akce pro přechod na přihlašovací formulář.",
    key: "auth.go_to_login",
    namespace: "auth",
  },
  {
    description: "Upozornění na neúspěšný přenos košíku po přihlášení.",
    key: "auth.cart_transfer_failed",
    namespace: "auth",
  },
  {
    description: "Nadpis seznamu požadavků na heslo.",
    key: "auth.password_requirements.title",
    namespace: "auth",
  },
  {
    description: "Požadavek na minimální délku hesla.",
    key: "auth.password_requirements.min_length",
    namespace: "auth",
  },
  {
    description: "Požadavek na číslici v hesle.",
    key: "auth.password_requirements.number",
    namespace: "auth",
  },
  {
    description: "Validační hláška pro chybějící typ účtu.",
    key: "auth.validation.account_type_required",
    namespace: "auth",
  },
  {
    description: "Validační hláška pro chybějící heslo.",
    key: "auth.validation.password_required",
    namespace: "auth",
  },
  {
    description: "Validační hláška pro příliš krátké heslo.",
    key: "auth.validation.password_min_length",
    namespace: "auth",
  },
  {
    description: "Validační hláška pro heslo bez číslice.",
    key: "auth.validation.password_number",
    namespace: "auth",
  },
  {
    description: "Validační hláška pro chybějící potvrzení hesla.",
    key: "auth.validation.confirm_password_required",
    namespace: "auth",
  },
  {
    description: "Validační hláška pro rozdílná hesla.",
    key: "auth.validation.password_mismatch",
    namespace: "auth",
  },
  {
    description: "Validační hláška pro chybějící souhlas s podmínkami.",
    key: "auth.validation.terms_required",
    namespace: "auth",
  },
] as const satisfies readonly StorefrontTextDefinition[]

export const STOREFRONT_AUTH_TEXT_DEFINITIONS = [
  ...STOREFRONT_AUTH_SHARED_TEXT_DEFINITIONS,
  ...STOREFRONT_AUTH_LOGIN_TEXT_DEFINITIONS,
  ...STOREFRONT_AUTH_REGISTER_TEXT_DEFINITIONS,
  ...STOREFRONT_AUTH_PASSWORD_TEXT_DEFINITIONS,
] as const satisfies readonly StorefrontTextDefinition[]

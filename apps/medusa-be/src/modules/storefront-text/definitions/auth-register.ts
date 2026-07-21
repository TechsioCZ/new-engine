import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_AUTH_REGISTER_TEXT_DEFINITIONS = [
  {
    description: "Nadpis registrační stránky.",
    key: "auth.register.title",
    namespace: "auth",
  },
  {
    description: "Popis registračního formuláře.",
    key: "auth.register.description",
    namespace: "auth",
  },
  {
    description: "Akce pro odeslání registrace.",
    key: "auth.register.submit",
    namespace: "auth",
  },
  {
    description: "Text před odkazem na přihlášení z registrace.",
    key: "auth.register.has_account",
    namespace: "auth",
  },
  {
    description: "Popisek volby typu registrovaného účtu.",
    key: "auth.register.account_type",
    namespace: "auth",
  },
  {
    description: "Název běžného zákaznického účtu.",
    key: "auth.register.retail_label",
    namespace: "auth",
  },
  {
    description: "Popis registrace běžného zákaznického účtu.",
    key: "auth.register.retail_description",
    namespace: "auth",
  },
  {
    description: "Název velkoobchodního zákaznického účtu.",
    key: "auth.register.wholesale_label",
    namespace: "auth",
  },
  {
    description: "Popis registrace velkoobchodního zákaznického účtu.",
    key: "auth.register.wholesale_description",
    namespace: "auth",
  },
  {
    description: "Přístupný nadpis firemních údajů registrace.",
    key: "auth.register.company_fields",
    namespace: "auth",
  },
  {
    description: "Souhlas s obchodními podmínkami při registraci.",
    key: "auth.register.accept_terms",
    namespace: "auth",
  },
  {
    description: "Potvrzení úspěšné registrace.",
    key: "auth.register.success",
    namespace: "auth",
  },
  {
    description: "Potvrzení odeslání žádosti o velkoobchodní účet.",
    key: "auth.register.wholesale_success",
    namespace: "auth",
  },
  {
    description: "Chyba registrace pro již používaný e-mail.",
    key: "auth.register.email_exists",
    namespace: "auth",
  },
  {
    description: "Obecná chyba registrace.",
    key: "auth.register.failed",
    namespace: "auth",
  },
] as const satisfies readonly StorefrontTextDefinition[]

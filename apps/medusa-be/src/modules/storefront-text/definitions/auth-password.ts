import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_AUTH_PASSWORD_TEXT_DEFINITIONS = [
  {
    description: "Nadpis formuláře pro zapomenuté heslo.",
    key: "auth.forgot.title",
    namespace: "auth",
  },
  {
    description: "Popis formuláře pro zapomenuté heslo.",
    key: "auth.forgot.description",
    namespace: "auth",
  },
  {
    description: "Akce pro odeslání odkazu na obnovu hesla.",
    key: "auth.forgot.submit",
    namespace: "auth",
  },
  {
    description: "Potvrzení odeslání odkazu na obnovu hesla.",
    key: "auth.forgot.sent",
    namespace: "auth",
  },
  {
    description: "Nápověda při nedoručeném e-mailu pro obnovu hesla.",
    key: "auth.forgot.delivery_help",
    namespace: "auth",
  },
  {
    description: "Chyba při odeslání odkazu na obnovu hesla.",
    key: "auth.forgot.failed",
    namespace: "auth",
  },
  {
    description: "Nadpis formuláře pro obnovu hesla.",
    key: "auth.reset.title",
    namespace: "auth",
  },
  {
    description: "Obecný popis formuláře pro obnovu hesla.",
    key: "auth.reset.description",
    namespace: "auth",
  },
  {
    description: "Popis formuláře pro obnovu hesla s e-mailem účtu.",
    key: "auth.reset.description_with_email",
    namespace: "auth",
  },
  {
    description: "Nápověda pro neplatný odkaz na obnovu hesla.",
    key: "auth.reset.expired_help",
    namespace: "auth",
  },
  {
    description: "Akce pro vyžádání nového odkazu na obnovu hesla.",
    key: "auth.reset.expired_link",
    namespace: "auth",
  },
  {
    description: "Chyba pro neplatný nebo prošlý odkaz na obnovu hesla.",
    key: "auth.reset.expired_message",
    namespace: "auth",
  },
  {
    description: "Obecná chyba při obnově hesla.",
    key: "auth.reset.failed",
    namespace: "auth",
  },
  {
    description: "Akce pro odeslání nového hesla.",
    key: "auth.reset.submit",
    namespace: "auth",
  },
  {
    description: "Potvrzení úspěšné obnovy hesla.",
    key: "auth.reset.success",
    namespace: "auth",
  },
  {
    description: "Nadpis formuláře pro první nastavení hesla.",
    key: "auth.account_setup.title",
    namespace: "auth",
  },
  {
    description: "Obecný popis dokončení registrace nastavením hesla.",
    key: "auth.account_setup.description",
    namespace: "auth",
  },
  {
    description: "Popis dokončení registrace s e-mailem účtu.",
    key: "auth.account_setup.description_with_email",
    namespace: "auth",
  },
  {
    description: "Nápověda pro neplatný odkaz na první nastavení hesla.",
    key: "auth.account_setup.expired_help",
    namespace: "auth",
  },
  {
    description: "Akce pro vyžádání nového odkazu na první nastavení hesla.",
    key: "auth.account_setup.expired_link",
    namespace: "auth",
  },
  {
    description: "Chyba pro neplatný odkaz na dokončení registrace.",
    key: "auth.account_setup.expired_message",
    namespace: "auth",
  },
  {
    description: "Obecná chyba při prvním nastavení hesla.",
    key: "auth.account_setup.failed",
    namespace: "auth",
  },
  {
    description: "Akce pro první nastavení hesla.",
    key: "auth.account_setup.submit",
    namespace: "auth",
  },
  {
    description: "Potvrzení úspěšného prvního nastavení hesla.",
    key: "auth.account_setup.success",
    namespace: "auth",
  },
] as const satisfies readonly StorefrontTextDefinition[]

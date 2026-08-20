import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_AUTH_DEACTIVATION_TEXT_DEFINITIONS = [
  {
    description: "Chybový stav nedostupné stránky zákaznického účtu.",
    key: "auth.deactivation.page.account_unavailable",
    namespace: "auth",
  },
  {
    description: "Chybový stav nedostupného potvrzení zrušení účtu.",
    key: "auth.deactivation.page.confirmation_unavailable",
    namespace: "auth",
  },
  {
    description: "Nadpis sekce pro žádost o zrušení účtu.",
    key: "auth.deactivation.request.title",
    namespace: "auth",
  },
  {
    description: "Popis procesu žádosti o zrušení účtu.",
    key: "auth.deactivation.request.description",
    namespace: "auth",
  },
  {
    description: "Obecná chyba odeslání potvrzení zrušení účtu.",
    key: "auth.deactivation.request.failed",
    namespace: "auth",
  },
  {
    description: "Nadpis toastu po odeslání potvrzovacího e-mailu.",
    key: "auth.deactivation.request.toast_title",
    namespace: "auth",
  },
  {
    description: "Popis toastu po odeslání potvrzovacího e-mailu.",
    key: "auth.deactivation.request.toast_description",
    namespace: "auth",
  },
  {
    description: "Stav po odeslání potvrzovacího e-mailu.",
    key: "auth.deactivation.request.sent_status",
    namespace: "auth",
  },
  {
    description: "Akce pro vyžádání zrušení účtu.",
    key: "auth.deactivation.request.action",
    namespace: "auth",
  },
  {
    description: "Akce pro opakované odeslání potvrzovacího e-mailu.",
    key: "auth.deactivation.request.resend_action",
    namespace: "auth",
  },
  {
    description: "Nadpis dialogu pro odeslání potvrzení zrušení účtu.",
    key: "auth.deactivation.dialog.title",
    namespace: "auth",
  },
  {
    description: "Úvod dialogu pro odeslání potvrzení zrušení účtu.",
    key: "auth.deactivation.dialog.intro",
    namespace: "auth",
  },
  {
    description: "Informace o platnosti potvrzovacího odkazu.",
    key: "auth.deactivation.dialog.email_notice",
    namespace: "auth",
  },
  {
    description: "Informace o nutnosti potvrdit zrušení účtu.",
    key: "auth.deactivation.dialog.confirmation_notice",
    namespace: "auth",
  },
  {
    description: "Informace o zachování existujících objednávek.",
    key: "auth.deactivation.dialog.orders_notice",
    namespace: "auth",
  },
  {
    description: "Akce pro ponechání zákaznického účtu.",
    key: "auth.deactivation.dialog.keep_account",
    namespace: "auth",
  },
  {
    description: "Akce pro odeslání potvrzovacího e-mailu.",
    key: "auth.deactivation.dialog.send",
    namespace: "auth",
  },
  {
    description: "Stav odesílání potvrzovacího e-mailu.",
    key: "auth.deactivation.dialog.sending",
    namespace: "auth",
  },
  {
    description: "Nadpis stránky potvrzení zrušení účtu.",
    key: "auth.deactivation.confirmation.title",
    namespace: "auth",
  },
  {
    description: "Popis následků potvrzení zrušení účtu.",
    key: "auth.deactivation.confirmation.description",
    namespace: "auth",
  },
  {
    description: "Chyba chybějícího tokenu potvrzení zrušení účtu.",
    key: "auth.deactivation.confirmation.missing_token",
    namespace: "auth",
  },
  {
    description: "Chyba neplatného nebo expirovaného potvrzovacího tokenu.",
    key: "auth.deactivation.confirmation.invalid_token",
    namespace: "auth",
  },
  {
    description: "Obecná chyba potvrzení zrušení účtu.",
    key: "auth.deactivation.confirmation.failed",
    namespace: "auth",
  },
  {
    description: "Stav úspěšně zrušeného účtu.",
    key: "auth.deactivation.confirmation.success",
    namespace: "auth",
  },
  {
    description: "Navigace do obchodu po zrušení účtu.",
    key: "auth.deactivation.confirmation.continue",
    namespace: "auth",
  },
  {
    description: "Akce pro potvrzení zrušení účtu.",
    key: "auth.deactivation.confirmation.confirm",
    namespace: "auth",
  },
  {
    description: "Stav probíhajícího rušení účtu.",
    key: "auth.deactivation.confirmation.confirming",
    namespace: "auth",
  },
] as const satisfies readonly StorefrontTextDefinition[]

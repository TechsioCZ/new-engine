import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_ACCOUNT_DEACTIVATION_TEXT_DEFINITIONS = [
  {
    description: "Titulek stránky pro potvrzení zrušení účtu.",
    key: "auth.account.deactivation.metadata_title",
    namespace: "auth",
  },
  {
    description: "Nadpis sekce pro zrušení zákaznického účtu.",
    key: "auth.account.deactivation.section.title",
    namespace: "auth",
  },
  {
    description: "Popis procesu zrušení zákaznického účtu.",
    key: "auth.account.deactivation.section.description",
    namespace: "auth",
  },
  {
    description: "Potvrzení, že byl odeslán e-mail s odkazem pro zrušení účtu.",
    key: "auth.account.deactivation.section.sent_status",
    namespace: "auth",
  },
  {
    description: "Akce pro vyžádání zrušení zákaznického účtu.",
    key: "auth.account.deactivation.section.request_action",
    namespace: "auth",
  },
  {
    description: "Akce pro opětovné odeslání potvrzovacího e-mailu.",
    key: "auth.account.deactivation.section.resend_action",
    namespace: "auth",
  },
  {
    description: "Nadpis dialogu pro odeslání potvrzení zrušení účtu.",
    key: "auth.account.deactivation.dialog.title",
    namespace: "auth",
  },
  {
    description: "Úvodní vysvětlení dialogu pro zrušení účtu.",
    key: "auth.account.deactivation.dialog.intro",
    namespace: "auth",
  },
  {
    description: "Informace o platnosti odkazu pro zrušení účtu.",
    key: "auth.account.deactivation.dialog.link_expiry",
    namespace: "auth",
  },
  {
    description: "Informace o nutnosti potvrdit zrušení účtu.",
    key: "auth.account.deactivation.dialog.confirmation_required",
    namespace: "auth",
  },
  {
    description: "Informace o zachování existujících objednávek.",
    key: "auth.account.deactivation.dialog.orders_preserved",
    namespace: "auth",
  },
  {
    description: "Akce pro ponechání zákaznického účtu.",
    key: "auth.account.deactivation.dialog.keep_action",
    namespace: "auth",
  },
  {
    description: "Akce pro odeslání potvrzovacího e-mailu.",
    key: "auth.account.deactivation.dialog.submit_action",
    namespace: "auth",
  },
  {
    description: "Text akce během odesílání potvrzovacího e-mailu.",
    key: "auth.account.deactivation.dialog.loading",
    namespace: "auth",
  },
  {
    description: "Nadpis oznámení po odeslání potvrzovacího e-mailu.",
    key: "auth.account.deactivation.toast.title",
    namespace: "auth",
  },
  {
    description: "Popis oznámení po odeslání potvrzovacího e-mailu.",
    key: "auth.account.deactivation.toast.description",
    namespace: "auth",
  },
  {
    description: "Nadpis potvrzení zrušení zákaznického účtu.",
    key: "auth.account.deactivation.confirmation.title",
    namespace: "auth",
  },
  {
    description: "Popis důsledků potvrzení zrušení účtu.",
    key: "auth.account.deactivation.confirmation.description",
    namespace: "auth",
  },
  {
    description: "Potvrzení úspěšného zrušení zákaznického účtu.",
    key: "auth.account.deactivation.confirmation.success",
    namespace: "auth",
  },
  {
    description: "Akce pro návrat do obchodu po zrušení účtu.",
    key: "auth.account.deactivation.confirmation.store_action",
    namespace: "auth",
  },
  {
    description: "Akce pro potvrzení zrušení zákaznického účtu.",
    key: "auth.account.deactivation.confirmation.confirm_action",
    namespace: "auth",
  },
  {
    description: "Text akce během rušení zákaznického účtu.",
    key: "auth.account.deactivation.confirmation.loading",
    namespace: "auth",
  },
  {
    description: "Záložní chyba při odesílání potvrzovacího e-mailu.",
    key: "auth.account.deactivation.errors.request_failed",
    namespace: "auth",
  },
  {
    description: "Chyba pro chybějící nebo neplatný potvrzovací odkaz.",
    key: "auth.account.deactivation.errors.invalid_token",
    namespace: "auth",
  },
  {
    description: "Záložní chyba při potvrzení zrušení účtu.",
    key: "auth.account.deactivation.errors.confirmation_failed",
    namespace: "auth",
  },
] as const satisfies readonly StorefrontTextDefinition[]

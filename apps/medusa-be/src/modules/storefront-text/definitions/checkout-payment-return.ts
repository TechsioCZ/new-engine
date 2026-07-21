import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_CHECKOUT_PAYMENT_RETURN_TEXT_DEFINITIONS = [
  {
    description: "Fallback při čekání na potvrzení platby.",
    key: "checkout.payment_return_confirmation_pending",
    namespace: "checkout",
  },
  {
    description: "Fallback při chybě ověření platby.",
    key: "checkout.payment_return_verification_failed",
    namespace: "checkout",
  },
  {
    description: "Akce pro návrat ze stavu platby na souhrn objednávky.",
    key: "checkout.payment_return_back_to_summary",
    namespace: "checkout",
  },
  {
    description: "Akce pro změnu platby po návratu z platební brány.",
    key: "checkout.payment_return_change_payment",
    namespace: "checkout",
  },
  {
    description: "Nadpis stavu zrušené platby.",
    key: "checkout.payment_return_cancelled_title",
    namespace: "checkout",
  },
  {
    description: "Popis dalšího postupu po zrušení platby.",
    key: "checkout.payment_return_cancelled_description",
    namespace: "checkout",
  },
  {
    description: "Nadpis chyby při chybějícím identifikátoru košíku platby.",
    key: "checkout.payment_return_missing_cart_title",
    namespace: "checkout",
  },
  {
    description: "Popis chyby při chybějícím identifikátoru košíku platby.",
    key: "checkout.payment_return_missing_cart_description",
    namespace: "checkout",
  },
  {
    description: "Akce pro opakování ověření platby.",
    key: "checkout.payment_return_retry",
    namespace: "checkout",
  },
  {
    description: "Nadpis chyby při nepotvrzené platbě.",
    key: "checkout.payment_return_failed_title",
    namespace: "checkout",
  },
  {
    description: "Nadpis průběžného ověřování platby.",
    key: "checkout.payment_return_verifying_title",
    namespace: "checkout",
  },
  {
    description: "Popis průběžného ověřování platby.",
    key: "checkout.payment_return_verifying_description",
    namespace: "checkout",
  },
  {
    description: "Nápověda pro déle trvající ověření platby.",
    key: "checkout.payment_return_help",
    namespace: "checkout",
  },
  {
    description: "Srozumitelná chyba pro nedokončenou nebo zrušenou platbu.",
    key: "checkout.payment_return_not_completed",
    namespace: "checkout",
  },
] as const satisfies readonly StorefrontTextDefinition[]

import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_CHECKOUT_SIDEBAR_TEXT_DEFINITIONS = [
  {
    description: "Přístupný název pole pro zadání slevového kódu.",
    key: "checkout.promo_code_label",
    namespace: "checkout",
  },
  {
    description: "Placeholder pole pro zadání slevového kódu.",
    key: "checkout.promo_code_placeholder",
    namespace: "checkout",
  },
  {
    description: "Nadpis zákaznických benefitů v rekapitulaci checkoutu.",
    key: "checkout.benefits_label",
    namespace: "checkout",
  },
  {
    description: "Benefit bezplatného vrácení objednávky.",
    key: "checkout.return_policy_benefit",
    namespace: "checkout",
  },
  {
    description: "Nadpis akcí pro uložení košíku na později.",
    key: "checkout.save_cart_for_later",
    namespace: "checkout",
  },
  {
    description: "Akce pro uložení odkazu na košík.",
    key: "checkout.save_cart_link",
    namespace: "checkout",
  },
  {
    description: "Akce pro odeslání odkazu na košík e-mailem.",
    key: "checkout.send_cart_email",
    namespace: "checkout",
  },
] as const satisfies readonly StorefrontTextDefinition[]

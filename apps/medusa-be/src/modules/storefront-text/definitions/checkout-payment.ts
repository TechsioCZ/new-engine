import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_CHECKOUT_PAYMENT_TEXT_DEFINITIONS = [
  {
    description: "Fallback názvu neznámého poskytovatele platby.",
    key: "checkout.payment_provider_unknown",
    namespace: "checkout",
  },
  {
    description: "Název QR platby bankovním převodem.",
    key: "checkout.payment_provider_qr",
    namespace: "checkout",
  },
  {
    description: "Název online platby kartou přes konkrétní platební bránu.",
    key: "checkout.payment_provider_card_gateway",
    namespace: "checkout",
  },
  {
    description: "Název platby na dobírku.",
    key: "checkout.payment_provider_cash_on_delivery",
    namespace: "checkout",
  },
  {
    description: "Obecný název online platby kartou.",
    key: "checkout.payment_provider_card",
    namespace: "checkout",
  },
  {
    description:
      "Název platby kartou přes konkrétní bránu v rekapitulaci objednávky.",
    key: "checkout.payment_summary_card_gateway",
    namespace: "checkout",
  },
  {
    description:
      "Obecný název platby kartou a mobilní peněženkou v rekapitulaci.",
    key: "checkout.payment_summary_card_wallets",
    namespace: "checkout",
  },
  {
    description: "Krátká nápověda QR platby.",
    key: "checkout.payment_hint_qr",
    namespace: "checkout",
  },
  {
    description: "Popis QR platby bankovním převodem.",
    key: "checkout.payment_description_qr",
    namespace: "checkout",
  },
  {
    description: "Popis online platby kartou přes konkrétní platební bránu.",
    key: "checkout.payment_description_card_gateway",
    namespace: "checkout",
  },
] as const satisfies readonly StorefrontTextDefinition[]

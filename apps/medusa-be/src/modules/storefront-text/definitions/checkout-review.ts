import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_CHECKOUT_REVIEW_TEXT_DEFINITIONS = [
  {
    description: "Krátký popisek zákaznické poznámky v rekapitulaci objednávky.",
    key: "checkout.review_customer_note",
    namespace: "checkout",
  },
  {
    description: "Souhlas se zasíláním marketingových sdělení v rekapitulaci objednávky.",
    key: "checkout.review_marketing_consent",
    namespace: "checkout",
  },
  {
    description: "Souhlas se zasláním dotazníku spokojenosti Heureka.",
    key: "checkout.review_heureka_consent",
    namespace: "checkout",
  },
  {
    description: "Potvrzení obchodních podmínek a zásad ochrany osobních údajů s odkazy.",
    key: "checkout.review_legal_confirmation",
    namespace: "checkout",
  },
  {
    description: "Upozornění na neuložené povinné údaje v rekapitulaci objednávky.",
    key: "checkout.review_missing_required_details",
    namespace: "checkout",
  },
] as const satisfies readonly StorefrontTextDefinition[]

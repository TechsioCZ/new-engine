import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_CHECKOUT_CART_TEXT_DEFINITIONS = [
  {
    description:
      "Výzva k doplnění hodnoty košíku pro získání bezplatné dopravy.",
    key: "checkout.free_shipping_remaining",
    namespace: "checkout",
  },
  {
    description: "Potvrzení, že košík už splňuje podmínky bezplatné dopravy.",
    key: "checkout.free_shipping_qualified",
    namespace: "checkout",
  },
  {
    description: "Přístupný název ukazatele průběhu k bezplatné dopravě.",
    key: "checkout.free_shipping_progress_aria",
    namespace: "checkout",
  },
] as const satisfies readonly StorefrontTextDefinition[]

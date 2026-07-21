import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_CHECKOUT_ENTRY_TEXT_DEFINITIONS = [
  {
    description: "Text důvěryhodnosti bezpečného nákupu v hlavičce checkoutu.",
    key: "checkout.secure_purchase",
    namespace: "checkout",
  },
  {
    description: "Titulek výzvy k přihlášení v checkoutu.",
    key: "checkout.login_prompt_title",
    namespace: "checkout",
  },
  {
    description: "Text výzvy k přihlášení v checkoutu s odkazem.",
    key: "checkout.login_prompt_description",
    namespace: "checkout",
  },
  {
    description: "Titulek prázdného košíku v checkoutu.",
    key: "checkout.empty_cart_title",
    namespace: "checkout",
  },
  {
    description: "Doplňující text prázdného košíku v checkoutu.",
    key: "checkout.empty_cart_description",
    namespace: "checkout",
  },
  {
    description: "Akce pro přechod z prázdného checkoutu na nové produkty.",
    key: "checkout.empty_cart_browse_new_products",
    namespace: "checkout",
  },
  {
    description: "Akce pro návrat z prázdného checkoutu na domovskou stránku.",
    key: "checkout.empty_cart_home",
    namespace: "checkout",
  },
  {
    description: "Nadpis doporučených nových produktů v prázdném checkoutu.",
    key: "checkout.empty_cart_recommendations_title",
    namespace: "checkout",
  },
  {
    description: "Nadpis souvisejících produktů zobrazených v checkoutu.",
    key: "checkout.inline_products_title",
    namespace: "checkout",
  },
] as const satisfies readonly StorefrontTextDefinition[]

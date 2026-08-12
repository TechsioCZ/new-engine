import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_CHECKOUT_PICKUP_TEXT_DEFINITIONS = [
  {
    description: "Akce pro otevření výběru výdejního místa.",
    key: "checkout.select_pickup_point",
    namespace: "checkout",
  },
  {
    description: "Akce pro změnu vybraného výdejního místa.",
    key: "checkout.change_pickup_point",
    namespace: "checkout",
  },
  {
    description: "Souhrn vybraného výdejního místa.",
    key: "checkout.selected_pickup_point",
    namespace: "checkout",
  },
  {
    description: "Obecný název výdejního místa pro chybějící název dopravce.",
    key: "checkout.pickup_point_fallback",
    namespace: "checkout",
  },
  {
    description: "Chyba při neúplném výběru výdejního místa.",
    key: "checkout.pickup_selection_failed",
    namespace: "checkout",
  },
  {
    description: "Chyba pro aktuálně nedostupné výdejní místo.",
    key: "checkout.pickup_point_unavailable",
    namespace: "checkout",
  },
  {
    description: "Chyba při nedostupném výběru výdejního místa dopravce.",
    key: "checkout.pickup_selector_unavailable",
    namespace: "checkout",
  },
  {
    description: "Popisek vyhledávání GLS ParcelShopu.",
    key: "checkout.gls_pickup_search_label",
    namespace: "checkout",
  },
  {
    description: "Nápověda vyhledávání GLS ParcelShopu.",
    key: "checkout.gls_pickup_search_placeholder",
    namespace: "checkout",
  },
  {
    description: "Akce vyhledání GLS ParcelShopu.",
    key: "checkout.gls_pickup_search_action",
    namespace: "checkout",
  },
  {
    description: "Stav načítání GLS ParcelShopů.",
    key: "checkout.gls_pickup_search_loading",
    namespace: "checkout",
  },
  {
    description: "Prázdný výsledek vyhledávání GLS ParcelShopu.",
    key: "checkout.gls_pickup_search_empty",
    namespace: "checkout",
  },
] as const satisfies readonly StorefrontTextDefinition[]

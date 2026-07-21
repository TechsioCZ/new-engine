import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_CHECKOUT_DETAILS_TEXT_DEFINITIONS = [
  {
    description: "Nadpis fakturačních údajů v checkoutu.",
    key: "checkout.billing_details",
    namespace: "checkout",
  },
  {
    description: "Volba shodné fakturační a doručovací adresy.",
    key: "checkout.billing_same_as_shipping",
    namespace: "checkout",
  },
  {
    description: "Přístupný popisek volby typu nákupu.",
    key: "checkout.purchase_type",
    namespace: "checkout",
  },
  {
    description: "Volba nákupu jako soukromá osoba.",
    key: "checkout.private_purchase",
    namespace: "checkout",
  },
  {
    description: "Volba nákupu na firmu.",
    key: "checkout.company_purchase",
    namespace: "checkout",
  },
  {
    description: "Nadpis doručení na výdejní místo.",
    key: "checkout.pickup_delivery",
    namespace: "checkout",
  },
  {
    description: "Nadpis kontaktních a fakturačních údajů.",
    key: "checkout.contact_and_billing_details",
    namespace: "checkout",
  },
  {
    description: "Volba registrace při dokončení objednávky.",
    key: "checkout.registration_opt_in",
    namespace: "checkout",
  },
  {
    description: "Doplňující informace k registraci v checkoutu.",
    key: "checkout.registration_info",
    namespace: "checkout",
  },
  {
    description: "Chyba pro zemi nedostupnou v aktuálním regionu košíku.",
    key: "checkout.country_unavailable",
    namespace: "checkout",
  },
  {
    description: "Chyba při uložení adresy v checkoutu.",
    key: "checkout.address_update_failed",
    namespace: "checkout",
  },
  {
    description: "Chyba při uložení požadavku na registraci.",
    key: "checkout.registration_update_failed",
    namespace: "checkout",
  },
] as const satisfies readonly StorefrontTextDefinition[]

import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_CHECKOUT_CART_TEXT_DEFINITIONS = [
  {
    description:
      "Výzva k doplnění hodnoty košíku pro získání bezplatné dopravy.",
    key: "checkout.free_shipping_remaining",
    namespace: "checkout",
    values: {
      cz: "Nakupte ještě za {missingAmount} a získejte <strong>dopravu zdarma.</strong>",
      hu: "Vásároljon még {missingAmount} értékben, és kapjon <strong>ingyenes szállítást.</strong>",
      ro: "Mai adăugați produse în valoare de {missingAmount} și beneficiați de <strong>transport gratuit.</strong>",
      sk: "Nakúpte ešte za {missingAmount} a získajte <strong>dopravu zadarmo.</strong>",
    },
  },
  {
    description: "Potvrzení, že košík už splňuje podmínky bezplatné dopravy.",
    key: "checkout.free_shipping_qualified",
    namespace: "checkout",
    values: {
      cz: "Dopravu zdarma už máte v košíku.",
      hu: "A kosara már jogosult az ingyenes szállításra.",
      ro: "Coșul beneficiază deja de transport gratuit.",
      sk: "Dopravu zadarmo už máte v košíku.",
    },
  },
  {
    description: "Přístupný název ukazatele průběhu k bezplatné dopravě.",
    key: "checkout.free_shipping_progress_aria",
    namespace: "checkout",
    values: {
      cz: "Průběh k dopravě zdarma",
      hu: "Előrehaladás az ingyenes szállítás felé",
      ro: "Progres către transportul gratuit",
      sk: "Priebeh k doprave zadarmo",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]

import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_CHECKOUT_PICKUP_TEXT_DEFINITIONS = [
  {
    description: "Akce pro otevření výběru výdejního místa.",
    key: "checkout.select_pickup_point",
    namespace: "checkout",
    values: {
      cz: "Vybrat výdejní místo",
      hu: "Átvételi pont kiválasztása",
      ro: "Alege punctul de ridicare",
      sk: "Vybrať výdajné miesto",
    },
  },
  {
    description: "Akce pro změnu vybraného výdejního místa.",
    key: "checkout.change_pickup_point",
    namespace: "checkout",
    values: {
      cz: "Změnit výdejní místo",
      hu: "Átvételi pont módosítása",
      ro: "Schimbă punctul de ridicare",
      sk: "Zmeniť výdajné miesto",
    },
  },
  {
    description: "Souhrn vybraného výdejního místa.",
    key: "checkout.selected_pickup_point",
    namespace: "checkout",
    values: {
      cz: "Výdejní místo: {pickupPointName}",
      hu: "Átvételi pont: {pickupPointName}",
      ro: "Punct de ridicare: {pickupPointName}",
      sk: "Výdajné miesto: {pickupPointName}",
    },
  },
  {
    description: "Obecný název výdejního místa pro chybějící název dopravce.",
    key: "checkout.pickup_point_fallback",
    namespace: "checkout",
    values: {
      cz: "Výdejní místo",
      hu: "Átvételi pont",
      ro: "Punct de ridicare",
      sk: "Výdajné miesto",
    },
  },
  {
    description: "Chyba při neúplném výběru výdejního místa.",
    key: "checkout.pickup_selection_failed",
    namespace: "checkout",
    values: {
      cz: "Výběr výdejního místa se nepodařilo dokončit. Zkuste to prosím znovu.",
      hu: "Az átvételi pont kiválasztása nem sikerült. Kérjük, próbálja újra.",
      ro: "Selectarea punctului de ridicare nu a putut fi finalizată. Încercați din nou.",
      sk: "Výber výdajného miesta sa nepodarilo dokončiť. Skúste to prosím znova.",
    },
  },
  {
    description: "Chyba pro aktuálně nedostupné výdejní místo.",
    key: "checkout.pickup_point_unavailable",
    namespace: "checkout",
    values: {
      cz: "Vybrané výdejní místo momentálně není dostupné.",
      hu: "A kiválasztott átvételi pont jelenleg nem érhető el.",
      ro: "Punctul de ridicare selectat nu este disponibil momentan.",
      sk: "Vybrané výdajné miesto momentálne nie je dostupné.",
    },
  },
  {
    description: "Chyba při nedostupném výběru výdejního místa dopravce.",
    key: "checkout.pickup_selector_unavailable",
    namespace: "checkout",
    values: {
      cz: "Výběr výdejního místa je dočasně nedostupný. Zkuste to prosím později.",
      hu: "Az átvételi pont kiválasztása átmenetileg nem érhető el. Kérjük, próbálja újra később.",
      ro: "Selectarea punctului de ridicare este temporar indisponibilă. Încercați din nou mai târziu.",
      sk: "Výber výdajného miesta je dočasne nedostupný. Skúste to prosím neskôr.",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]

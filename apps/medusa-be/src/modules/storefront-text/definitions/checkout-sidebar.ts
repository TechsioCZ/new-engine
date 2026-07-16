import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_CHECKOUT_SIDEBAR_TEXT_DEFINITIONS = [
  {
    description: "Přístupný název pole pro zadání slevového kódu.",
    key: "checkout.promo_code_label",
    namespace: "checkout",
    values: {
      cz: "Slevový kód",
      hu: "Kedvezménykód",
      ro: "Cod de reducere",
      sk: "Zľavový kód",
    },
  },
  {
    description: "Placeholder pole pro zadání slevového kódu.",
    key: "checkout.promo_code_placeholder",
    namespace: "checkout",
    values: {
      cz: "Zadat slevový kód",
      hu: "Kedvezménykód megadása",
      ro: "Introdu codul de reducere",
      sk: "Zadať zľavový kód",
    },
  },
  {
    description: "Nadpis zákaznických benefitů v rekapitulaci checkoutu.",
    key: "checkout.benefits_label",
    namespace: "checkout",
    values: {
      cz: "Výhody",
      hu: "Előnyök",
      ro: "Beneficii",
      sk: "Benefity",
    },
  },
  {
    description: "Benefit bezplatného vrácení objednávky.",
    key: "checkout.return_policy_benefit",
    namespace: "checkout",
    values: {
      cz: "Vrácení do 14 dnů zdarma",
      hu: "Ingyenes visszaküldés 14 napon belül",
      ro: "Retur gratuit în termen de 14 zile",
      sk: "Vrátenie do 14 dní zadarmo",
    },
  },
  {
    description: "Nadpis akcí pro uložení košíku na později.",
    key: "checkout.save_cart_for_later",
    namespace: "checkout",
    values: {
      cz: "Uložit košík na později",
      hu: "Kosár mentése későbbre",
      ro: "Salvează coșul pentru mai târziu",
      sk: "Odložiť si košík na neskôr",
    },
  },
  {
    description: "Akce pro uložení odkazu na košík.",
    key: "checkout.save_cart_link",
    namespace: "checkout",
    values: {
      cz: "Uložit odkaz",
      hu: "Hivatkozás mentése",
      ro: "Salvează linkul",
      sk: "Uložiť odkaz",
    },
  },
  {
    description: "Akce pro odeslání odkazu na košík e-mailem.",
    key: "checkout.send_cart_email",
    namespace: "checkout",
    values: {
      cz: "Poslat e-mailem",
      hu: "Küldés e-mailben",
      ro: "Trimite prin e-mail",
      sk: "Poslať e-mailom",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]

import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_CHECKOUT_DETAILS_TEXT_DEFINITIONS = [
  {
    description: "Nadpis fakturačních údajů v checkoutu.",
    key: "checkout.billing_details",
    namespace: "checkout",
    values: {
      cz: "Fakturační údaje",
      hu: "Számlázási adatok",
      ro: "Date de facturare",
      sk: "Fakturačné údaje",
    },
  },
  {
    description: "Volba shodné fakturační a doručovací adresy.",
    key: "checkout.billing_same_as_shipping",
    namespace: "checkout",
    values: {
      cz: "Fakturační adresa je stejná jako doručovací",
      hu: "A számlázási cím megegyezik a szállítási címmel",
      ro: "Adresa de facturare este aceeași cu adresa de livrare",
      sk: "Fakturačná adresa je rovnaká ako doručovacia",
    },
  },
  {
    description: "Přístupný popisek volby typu nákupu.",
    key: "checkout.purchase_type",
    namespace: "checkout",
    values: {
      cz: "Typ nákupu",
      hu: "Vásárlás típusa",
      ro: "Tipul achiziției",
      sk: "Typ nákupu",
    },
  },
  {
    description: "Volba nákupu jako soukromá osoba.",
    key: "checkout.private_purchase",
    namespace: "checkout",
    values: {
      cz: "Soukromá osoba",
      hu: "Magánszemélyként vásárolok",
      ro: "Persoană fizică",
      sk: "Súkromná osoba",
    },
  },
  {
    description: "Volba nákupu na firmu.",
    key: "checkout.company_purchase",
    namespace: "checkout",
    values: {
      cz: "Nakupuji na firmu",
      hu: "Cégként vásárolok",
      ro: "Cumpăr ca firmă",
      sk: "Nakupujem na firmu",
    },
  },
  {
    description: "Nadpis doručení na výdejní místo.",
    key: "checkout.pickup_delivery",
    namespace: "checkout",
    values: {
      cz: "Doručení na výdejní místo",
      hu: "Szállítás átvételi pontra",
      ro: "Livrare la punctul de ridicare",
      sk: "Doručenie na výdajné miesto",
    },
  },
  {
    description: "Nadpis kontaktních a fakturačních údajů.",
    key: "checkout.contact_and_billing_details",
    namespace: "checkout",
    values: {
      cz: "Kontaktní a fakturační údaje",
      hu: "Kapcsolattartási és számlázási adatok",
      ro: "Date de contact și facturare",
      sk: "Kontaktné a fakturačné údaje",
    },
  },
  {
    description: "Volba registrace při dokončení objednávky.",
    key: "checkout.registration_opt_in",
    namespace: "checkout",
    values: {
      cz: "Chci se registrovat",
      hu: "Szeretnék regisztrálni",
      ro: "Doresc să mă înregistrez",
      sk: "Chcem sa registrovať",
    },
  },
  {
    description: "Doplňující informace k registraci v checkoutu.",
    key: "checkout.registration_info",
    namespace: "checkout",
    values: {
      cz: "(Informace o registraci vám budou zaslány e-mailem)",
      hu: "(A regisztrációval kapcsolatos információkat e-mailben küldjük el)",
      ro: "(Informațiile despre înregistrare vă vor fi trimise prin e-mail)",
      sk: "(Informácie o registrácii Vám budú zaslané e-mailom)",
    },
  },
  {
    description: "Chyba pro zemi nedostupnou v aktuálním regionu košíku.",
    key: "checkout.country_unavailable",
    namespace: "checkout",
    values: {
      cz: "Zvolená země není dostupná pro aktuální košík. Vyberte zemi z nabídky.",
      hu: "A kiválasztott ország nem érhető el az aktuális kosárhoz. Válasszon országot a listából.",
      ro: "Țara selectată nu este disponibilă pentru coșul actual. Selectați o țară din listă.",
      sk: "Zvolená krajina nie je dostupná pre aktuálny košík. Zvoľte krajinu z ponuky.",
    },
  },
  {
    description: "Chyba při uložení adresy v checkoutu.",
    key: "checkout.address_update_failed",
    namespace: "checkout",
    values: {
      cz: "Uložení adresy selhalo.",
      hu: "A cím mentése sikertelen.",
      ro: "Salvarea adresei a eșuat.",
      sk: "Uloženie adresy zlyhalo.",
    },
  },
  {
    description: "Chyba při uložení požadavku na registraci.",
    key: "checkout.registration_update_failed",
    namespace: "checkout",
    values: {
      cz: "Uložení registrace selhalo.",
      hu: "A regisztráció mentése sikertelen.",
      ro: "Salvarea înregistrării a eșuat.",
      sk: "Uloženie registrácie zlyhalo.",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]

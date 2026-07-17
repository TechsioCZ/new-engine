import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_CHECKOUT_PAYMENT_TEXT_DEFINITIONS = [
  {
    description: "Fallback názvu neznámého poskytovatele platby.",
    key: "checkout.payment_provider_unknown",
    namespace: "checkout",
    values: {
      cz: "Neznámý poskytovatel",
      hu: "Ismeretlen szolgáltató",
      ro: "Furnizor necunoscut",
      sk: "Neznámy poskytovateľ",
    },
  },
  {
    description: "Název QR platby bankovním převodem.",
    key: "checkout.payment_provider_qr",
    namespace: "checkout",
    values: {
      cz: "QR platba bankovním převodem",
      hu: "QR-kódos banki átutalás",
      ro: "Plată QR prin transfer bancar",
      sk: "QR platba bankovým prevodom",
    },
  },
  {
    description: "Název online platby kartou přes konkrétní platební bránu.",
    key: "checkout.payment_provider_card_gateway",
    namespace: "checkout",
    values: {
      cz: "Platba kartou online ({providerName})",
      hu: "Online bankkártyás fizetés ({providerName})",
      ro: "Plată online cu cardul ({providerName})",
      sk: "Platba kartou online ({providerName})",
    },
  },
  {
    description: "Název platby na dobírku.",
    key: "checkout.payment_provider_cash_on_delivery",
    namespace: "checkout",
    values: {
      cz: "Na dobírku",
      hu: "Utánvét",
      ro: "Plată ramburs",
      sk: "Na dobierku",
    },
  },
  {
    description: "Obecný název online platby kartou.",
    key: "checkout.payment_provider_card",
    namespace: "checkout",
    values: {
      cz: "Platba kartou online",
      hu: "Online bankkártyás fizetés",
      ro: "Plată online cu cardul",
      sk: "Platba kartou online",
    },
  },
  {
    description:
      "Název platby kartou přes konkrétní bránu v rekapitulaci objednávky.",
    key: "checkout.payment_summary_card_gateway",
    namespace: "checkout",
    values: {
      cz: "Platba kartou online přes {providerName}",
      hu: "Online bankkártyás fizetés a(z) {providerName} rendszerén keresztül",
      ro: "Plată online cu cardul prin {providerName}",
      sk: "Platba kartou online cez {providerName}",
    },
  },
  {
    description:
      "Obecný název platby kartou a mobilní peněženkou v rekapitulaci.",
    key: "checkout.payment_summary_card_wallets",
    namespace: "checkout",
    values: {
      cz: "Platba kartou, Google Pay nebo Apple Pay",
      hu: "Fizetés bankkártyával, Google Payjel vagy Apple Payjel",
      ro: "Plată cu cardul, Google Pay sau Apple Pay",
      sk: "Platba kartou, Google Pay alebo Apple Pay",
    },
  },
  {
    description: "Krátká nápověda QR platby.",
    key: "checkout.payment_hint_qr",
    namespace: "checkout",
    values: {
      cz: "QR po odeslání",
      hu: "QR-kód a rendelés elküldése után",
      ro: "QR după trimiterea comenzii",
      sk: "QR po odoslaní",
    },
  },
  {
    description: "Popis QR platby bankovním převodem.",
    key: "checkout.payment_description_qr",
    namespace: "checkout",
    values: {
      cz: "Po odeslání objednávky zobrazíme QR kód i údaje pro bankovní převod.",
      hu: "A rendelés elküldése után megjelenítjük a QR-kódot és a banki átutaláshoz szükséges adatokat.",
      ro: "După trimiterea comenzii, vom afișa codul QR și datele pentru transferul bancar.",
      sk: "Po odoslaní objednávky zobrazíme QR kód aj údaje na bankový prevod.",
    },
  },
  {
    description: "Popis online platby kartou přes konkrétní platební bránu.",
    key: "checkout.payment_description_card_gateway",
    namespace: "checkout",
    values: {
      cz: "Online platba kartou přes platební bránu {providerName}.",
      hu: "Online bankkártyás fizetés a(z) {providerName} fizetési kapun keresztül.",
      ro: "Plată online cu cardul prin gateway-ul de plată {providerName}.",
      sk: "Online platba kartou cez platobnú bránu {providerName}.",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]

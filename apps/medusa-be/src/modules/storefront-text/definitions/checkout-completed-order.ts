import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_CHECKOUT_COMPLETED_ORDER_TEXT_DEFINITIONS = [
  {
    description: "Nadpis potvrzení dokončené objednávky.",
    key: "checkout.completed_order_title",
    namespace: "checkout",
    values: {
      cz: "Objednávka dokončena",
      hu: "Rendelés befejezve",
      ro: "Comandă finalizată",
      sk: "Objednávka dokončená",
    },
  },
  {
    description: "Potvrzení vytvořené objednávky s jejím identifikátorem.",
    key: "checkout.completed_order_created",
    namespace: "checkout",
    values: {
      cz: "Objednávka byla vytvořena ({orderId}).",
      hu: "A rendelés létrejött ({orderId}).",
      ro: "Comanda a fost creată ({orderId}).",
      sk: "Objednávka bola vytvorená ({orderId}).",
    },
  },
  {
    description: "Stav přípravy QR údajů pro bankovní převod.",
    key: "checkout.completed_order_qr_preparing",
    namespace: "checkout",
    values: {
      cz: "Připravujeme QR údaje pro bankovní převod.",
      hu: "Előkészítjük a banki átutalás QR-adatait.",
      ro: "Pregătim datele QR pentru transferul bancar.",
      sk: "Pripravujeme QR údaje na bankový prevod.",
    },
  },
  {
    description: "Chyba při načtení QR platby dokončené objednávky.",
    key: "checkout.completed_order_qr_failed",
    namespace: "checkout",
    values: {
      cz: "QR platbu se nepodařilo načíst. Platební údaje najdete také v potvrzení objednávky.",
      hu: "A QR-fizetést nem sikerült betölteni. A fizetési adatokat a rendelés visszaigazolásában is megtalálja.",
      ro: "Plata QR nu a putut fi încărcată. Datele de plată se găsesc și în confirmarea comenzii.",
      sk: "QR platbu sa nepodarilo načítať. Platobné údaje nájdete aj v potvrdení objednávky.",
    },
  },
  {
    description: "Akce pro pokračování v nákupu po dokončení objednávky.",
    key: "checkout.completed_order_continue_shopping",
    namespace: "checkout",
    values: {
      cz: "Pokračovat v nákupu",
      hu: "Vásárlás folytatása",
      ro: "Continuă cumpărăturile",
      sk: "Pokračovať v nákupe",
    },
  },
  {
    description: "Akce pro přechod do zákaznického účtu po objednávce.",
    key: "checkout.completed_order_go_to_account",
    namespace: "checkout",
    values: {
      cz: "Přejít do účtu",
      hu: "Tovább a fiókhoz",
      ro: "Mergi la cont",
      sk: "Prejsť na účet",
    },
  },
  {
    description: "Popisek částky v údajích QR platby.",
    key: "checkout.completed_order_qr_amount",
    namespace: "checkout",
    values: {
      cz: "Částka",
      hu: "Összeg",
      ro: "Sumă",
      sk: "Suma",
    },
  },
  {
    description: "Popisek IBAN v údajích QR platby.",
    key: "checkout.completed_order_qr_iban",
    namespace: "checkout",
    values: {
      cz: "IBAN",
      hu: "IBAN",
      ro: "IBAN",
      sk: "IBAN",
    },
  },
  {
    description: "Popisek platební reference v údajích QR platby.",
    key: "checkout.completed_order_qr_reference",
    namespace: "checkout",
    values: {
      cz: "Variabilní symbol",
      hu: "Fizetési azonosító",
      ro: "Referință plată",
      sk: "Variabilný symbol",
    },
  },
  {
    description: "Popisek zprávy v údajích QR platby.",
    key: "checkout.completed_order_qr_message",
    namespace: "checkout",
    values: {
      cz: "Zpráva",
      hu: "Közlemény",
      ro: "Mesaj",
      sk: "Správa",
    },
  },
  {
    description: "Přístupný název QR kódu pro platbu objednávky.",
    key: "checkout.completed_order_qr_aria",
    namespace: "checkout",
    values: {
      cz: "QR kód pro platbu objednávky {orderDisplayId}",
      hu: "QR-kód a(z) {orderDisplayId} rendelés kifizetéséhez",
      ro: "Cod QR pentru plata comenzii {orderDisplayId}",
      sk: "QR kód pre platbu objednávky {orderDisplayId}",
    },
  },
  {
    description: "Nadpis platby bankovním převodem po dokončení objednávky.",
    key: "checkout.completed_order_bank_transfer_title",
    namespace: "checkout",
    values: {
      cz: "Platba bankovním převodem",
      hu: "Fizetés banki átutalással",
      ro: "Plată prin transfer bancar",
      sk: "Platba bankovým prevodom",
    },
  },
  {
    description: "Pokyny k QR platbě bankovním převodem.",
    key: "checkout.completed_order_bank_transfer_instructions",
    namespace: "checkout",
    values: {
      cz: "Naskenujte QR kód v bankovní aplikaci nebo použijte platební údaje níže.",
      hu: "Olvassa be a QR-kódot a banki alkalmazásban, vagy használja az alábbi fizetési adatokat.",
      ro: "Scanați codul QR în aplicația bancară sau folosiți datele de plată de mai jos.",
      sk: "Naskenujte QR kód v bankovej aplikácii alebo použite platobné údaje nižšie.",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]

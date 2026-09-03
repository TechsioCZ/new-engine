import { legalTemplate, nonLegalPage } from "./builders"

export const HU_HU_DRAFT_PAGES = [
  nonLegalPage(
    "homepage",
    "Természetes gondoskodás a mindennapokra",
    "Fedezze fel a tudatos életmódhoz, személyes ápoláshoz és otthoni jólléthez összeállított kínálatot.",
    "Megalapozott választás",
    [
      "Böngésszen a kategóriák között, és vásárlás előtt ellenőrizze a termékoldalon és a csomagoláson szereplő összetételt, használatot és figyelmeztetéseket.",
    ]
  ),
  nonLegalPage(
    "about",
    "A Herbaticáról",
    "A Herbatica a mindennapi ápoláshoz és a tudatos életmódhoz kapcsolódó termékeket kínáló webáruház.",
    "Mit talál nálunk",
    [
      "A kínálatot áttekinthető kategóriákba rendezzük, a termékeknél pedig feltüntetjük az elérhető tulajdonságokat és használati információkat.",
    ]
  ),
  nonLegalPage(
    "faq",
    "Gyakori kérdések",
    "Gyors válaszok a termékválasztással és a rendelés menetével kapcsolatban.",
    "Vásárlás és támogatás",
    [
      "Használja a szűrőket és a termékadatokat. A rendelést a kapott üzenetekben követheti, kérdésével pedig a weboldalon közzétett kapcsolati csatornához fordulhat.",
    ]
  ),
  nonLegalPage(
    "contact-neutral",
    "Kapcsolat",
    "Segítségre van szüksége a rendeléshez vagy egy termék adatainak értelmezéséhez? Írjon a weboldalon közzétett kapcsolati csatornán.",
    "Biztonságos kapcsolat",
    [
      "Adja meg a rendelés számát, de ne küldjön érzékeny fizetési adatot vagy jelszót. Az üzemeltető adatai csak jóváhagyott profilból kerülhetnek ide.",
    ]
  ),
  nonLegalPage(
    "footer",
    "Webáruház lábléc",
    "Gyors hivatkozások a vásárláshoz, az ügyféltámogatáshoz és a kötelező tájékoztatókhoz.",
    "Navigáció",
    [
      "Termékek · Kategóriák · Kapcsolat · Gyakori kérdések · Szállítás · Visszaküldés · Rólunk · ÁSZF · Adatvédelem · Sütik",
    ]
  ),
  nonLegalPage(
    "affiliate",
    "Partnerprogram",
    "Olyan közönséget ér el, amelynek releváns lehet a kínálatunk? Küldjön alapvető információkat projektjéről.",
    "Felelős együttműködés",
    [
      "Mutassa be csatornáit, közönségét és javaslatát. Feltételek csak egyedi megerősítéssel jönnek létre, és nem használható jóvá nem hagyott egészségállítás.",
    ]
  ),
  nonLegalPage(
    "wholesale",
    "Nagykereskedelmi együttműködés",
    "Üzleti megkereséshez a kívánt választék és mennyiség alapján készítünk elő információkat.",
    "Ajánlatkérés",
    [
      "Adja meg a céget, piacot, termékeket, mennyiséget és határidőt. Az elérhetőség és ár az ajánlat elfogadásáig nem visszaigazolt.",
    ]
  ),
  nonLegalPage(
    "dropshipping",
    "Dropshipping",
    "A teljesítési együttműködést a piac, választék és technikai kapcsolat alapján egyedileg vizsgáljuk.",
    "Szükséges adatok",
    [
      "Küldje el a célországokat, várható forgalmat, integrációs és ügyfélszolgálati igényeket. Ez az oldal önmagában nem szolgáltatási ajánlat.",
    ]
  ),
  nonLegalPage(
    "private-label",
    "Saját márka",
    "A saját márkás megkereséseket kategória, mennyiség és piaci szabályozás szerint értékeljük.",
    "Szükséges adatok",
    [
      "Ismertesse a kategóriát, célpiacot, mennyiséget, csomagolást és időzítést. A megvalósítás külön megállapodást és megfelelőségi ellenőrzést igényel.",
    ]
  ),
  nonLegalPage(
    "gift-voucher",
    "Ajándékutalvány",
    "Az ajándékutalvánnyal a megajándékozott az áruház aktuális kínálatából választhat.",
    "Felhasználás",
    [
      "Vásárlás előtt ellenőrizze az utalvány értékét, érvényességét, kézbesítését és felhasználási szabályait.",
    ]
  ),
  legalTemplate(
    "terms",
    "Általános szerződési feltételek — kitöltendő minta",
    "Ez nem jogi tanács és nem jóváhagyott feltételrendszer. Minden mezőt az üzemeltetőnek kell kitöltenie és jogásszal ellenőriztetnie.",
    [
      "OPERATOR_LEGAL_NAME",
      "REGISTERED_ADDRESS",
      "COMPANY_ID",
      "VAT_ID",
      "CONTACT_EMAIL",
      "GOVERNING_LAW",
      "DISPUTE_RESOLUTION_BODY",
      "EFFECTIVE_DATE",
    ],
    "Kötelező kiegészítés",
    [
      "Eladó {{OPERATOR_LEGAL_NAME}}, székhely {{REGISTERED_ADDRESS}}, azonosító {{COMPANY_ID}}, adószám {{VAT_ID}}, kapcsolat {{CONTACT_EMAIL}}. Egészítse ki a szerződést, árakat, adókat, fizetést, szállítást, panaszt, elállást, felelősséget, jogot {{GOVERNING_LAW}}, vitarendezést {{DISPUTE_RESOLUTION_BODY}} és hatályt {{EFFECTIVE_DATE}}.",
    ]
  ),
  legalTemplate(
    "privacy",
    "Adatvédelem — kitöltendő minta",
    "A minta nem tehető közzé az adatkezelések teljes feltérképezése és jogi ellenőrzés nélkül.",
    [
      "DATA_CONTROLLER_LEGAL_NAME",
      "DATA_CONTROLLER_ADDRESS",
      "COMPANY_ID",
      "PRIVACY_EMAIL",
      "DPO_CONTACT_OR_NOT_APPLICABLE",
      "PROCESSOR_REGISTER_URL",
      "RETENTION_SCHEDULE",
      "SUPERVISORY_AUTHORITY",
      "EFFECTIVE_DATE",
    ],
    "Kötelező kiegészítés",
    [
      "Adatkezelő {{DATA_CONTROLLER_LEGAL_NAME}}, {{DATA_CONTROLLER_ADDRESS}}, azonosító {{COMPANY_ID}}, kapcsolat {{PRIVACY_EMAIL}}, tisztviselő {{DPO_CONTACT_OR_NOT_APPLICABLE}}. Adja meg a célokat, jogalapokat, adatokat, címzetteket, továbbítást, időt {{RETENTION_SCHEDULE}}, feldolgozókat {{PROCESSOR_REGISTER_URL}}, jogokat, hatóságot {{SUPERVISORY_AUTHORITY}} és hatályt {{EFFECTIVE_DATE}}.",
    ]
  ),
  legalTemplate(
    "cookies",
    "Sütik — kitöltendő minta",
    "A mintának a tényleges technológiákat kell tükröznie, és nem vélelmezheti a hozzájárulást.",
    [
      "CONSENT_PLATFORM",
      "COOKIE_INVENTORY_URL",
      "COOKIE_PROVIDERS",
      "COOKIE_DURATIONS",
      "CONSENT_WITHDRAWAL_PATH",
      "EFFECTIVE_DATE",
    ],
    "Kötelező kiegészítés",
    [
      "Hozzájárulás-kezelő {{CONSENT_PLATFORM}}, leltár {{COOKIE_INVENTORY_URL}}, szolgáltatók {{COOKIE_PROVIDERS}}, időtartamok {{COOKIE_DURATIONS}}, módosítás {{CONSENT_WITHDRAWAL_PATH}}, hatály {{EFFECTIVE_DATE}}. Egészítse ki a kategóriákat, célokat és jogalapokat.",
    ]
  ),
  legalTemplate(
    "returns",
    "Visszaküldés és elállás — kitöltendő minta",
    "A határidőket, kivételeket és költségeket az üzemeltetőnek és jogásznak kell megerősítenie.",
    [
      "RETURN_ADDRESS",
      "WITHDRAWAL_PERIOD_DAYS",
      "STATUTORY_EXCEPTIONS",
      "REFUND_DEADLINE_DAYS",
      "RETURN_COST_RULE",
      "COMPLAINT_AUTHORITY",
      "EFFECTIVE_DATE",
    ],
    "Kötelező kiegészítés",
    [
      "Adja meg az értesítést, címet {{RETURN_ADDRESS}}, határidőt {{WITHDRAWAL_PERIOD_DAYS}}, kivételeket {{STATUTORY_EXCEPTIONS}}, visszatérítést {{REFUND_DEADLINE_DAYS}}, költséget {{RETURN_COST_RULE}}, hatóságot {{COMPLAINT_AUTHORITY}} és hatályt {{EFFECTIVE_DATE}}.",
    ]
  ),
  legalTemplate(
    "shipping",
    "Szállítás — kitöltendő minta",
    "A fuvarozóknak, áraknak és határidőknek az üzemeltető jóváhagyott ajánlatából kell származniuk.",
    [
      "SUPPORTED_COUNTRIES",
      "CARRIERS",
      "SHIPPING_PRICE_TABLE_URL",
      "DISPATCH_TIME",
      "DELIVERY_WINDOWS",
      "DAMAGE_CLAIM_PROCESS",
      "EFFECTIVE_DATE",
    ],
    "Kötelező kiegészítés",
    [
      "Országok {{SUPPORTED_COUNTRIES}}, fuvarozók {{CARRIERS}}, árak {{SHIPPING_PRICE_TABLE_URL}}, feladás {{DISPATCH_TIME}}, kézbesítés {{DELIVERY_WINDOWS}}, sérülés {{DAMAGE_CLAIM_PROCESS}}, hatály {{EFFECTIVE_DATE}}.",
    ]
  ),
] as const

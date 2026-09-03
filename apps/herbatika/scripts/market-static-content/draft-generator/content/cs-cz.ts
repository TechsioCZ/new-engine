import { legalTemplate, nonLegalPage } from "./builders"

export const CS_CZ_DRAFT_PAGES = [
  nonLegalPage(
    "homepage",
    "Přírodní péče pro každý den",
    "Objevte pečlivě vybraný sortiment pro zdravý životní styl, osobní péči a domácí pohodu.",
    "Informovaný výběr",
    [
      "Procházejte kategorie a před nákupem zkontrolujte složení, použití a upozornění uvedené na produktové stránce a obalu.",
    ]
  ),
  nonLegalPage(
    "about",
    "O Herbatice",
    "Herbatica je internetový obchod zaměřený na produkty pro každodenní péči a zdravý životní styl.",
    "Co u nás najdete",
    [
      "Sortiment přehledně řadíme do kategorií a u položek uvádíme dostupné informace o vlastnostech a použití.",
    ]
  ),
  nonLegalPage(
    "faq",
    "Časté otázky",
    "Rychlé odpovědi k výběru produktů a průběhu objednávky.",
    "Nákup a podpora",
    [
      "Použijte filtry a údaje u produktu. Stav objednávky sledujte v doručených zprávách. S dotazem použijte kontaktní kanál zveřejněný na webu.",
    ]
  ),
  nonLegalPage(
    "contact-neutral",
    "Kontakt",
    "Potřebujete poradit s objednávkou nebo informacemi u produktu? Napište prostřednictvím kontaktního kanálu zveřejněného na webu.",
    "Bezpečný kontakt",
    [
      "Uveďte číslo objednávky, ale neposílejte citlivé platební údaje ani hesla. Identifikační údaje musí před zveřejněním pocházet ze schváleného profilu provozovatele.",
    ]
  ),
  nonLegalPage(
    "footer",
    "Patička obchodu",
    "Rychlé odkazy na nákup, zákaznickou podporu a povinné informace.",
    "Navigace",
    [
      "Produkty · Kategorie · Kontakt · Časté otázky · Doprava · Vrácení zboží · O nás · Obchodní podmínky · Ochrana soukromí · Cookies",
    ]
  ),
  nonLegalPage(
    "affiliate",
    "Partnerský program",
    "Máte publikum, pro které může být náš sortiment relevantní? Pošlete základní informace o svém projektu.",
    "Odpovědná spolupráce",
    [
      "Popište kanály, publikum a návrh spolupráce. Podmínky vzniknou až individuálním potvrzením a partner nesmí používat neschválená zdravotní tvrzení.",
    ]
  ),
  nonLegalPage(
    "wholesale",
    "Velkoobchodní spolupráce",
    "Pro firemní poptávky připravíme podklady podle požadovaného sortimentu a objemu.",
    "Poptávka",
    [
      "Uveďte firmu, trh, položky, množství a termín. Dostupnost ani cena nejsou potvrzené do přijetí nabídky.",
    ]
  ),
  nonLegalPage(
    "dropshipping",
    "Dropshipping",
    "Možnosti expediční spolupráce posuzujeme individuálně podle trhu, sortimentu a technického napojení.",
    "Podklady",
    [
      "Zašlete cílové země, očekávaný objem a požadavky na integraci a servis. Tato stránka sama o sobě není nabídkou služby.",
    ]
  ),
  nonLegalPage(
    "private-label",
    "Privátní značka",
    "Poptávky na produkty pod vlastní značkou vyhodnocujeme podle kategorie, množství a regulatorních požadavků trhu.",
    "Podklady",
    [
      "Popište kategorii, trh, množství, balení a termín. Realizace podléhá samostatné dohodě a kontrole souladu.",
    ]
  ),
  nonLegalPage(
    "gift-voucher",
    "Dárkový poukaz",
    "Dárkový poukaz umožní obdarovanému vybrat si z aktuální nabídky obchodu.",
    "Použití",
    [
      "Před nákupem zkontrolujte hodnotu, dobu platnosti, doručení a pravidla uvedená u konkrétního poukazu.",
    ]
  ),
  legalTemplate(
    "terms",
    "Obchodní podmínky — šablona k doplnění",
    "Nejde o právní radu ani schválené podmínky. Všechna pole musí doplnit provozovatel a zkontrolovat právník.",
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
    "Povinné doplnění",
    [
      "Prodávající {{OPERATOR_LEGAL_NAME}}, sídlo {{REGISTERED_ADDRESS}}, IČ {{COMPANY_ID}}, DIČ {{VAT_ID}}, kontakt {{CONTACT_EMAIL}}. Doplňte smlouvu, ceny, daně, platbu, dodání, reklamace, odstoupení, odpovědnost, právo {{GOVERNING_LAW}}, řešení sporů {{DISPUTE_RESOLUTION_BODY}} a účinnost {{EFFECTIVE_DATE}}.",
    ]
  ),
  legalTemplate(
    "privacy",
    "Ochrana soukromí — šablona k doplnění",
    "Šablona nesmí být zveřejněna bez mapování zpracování osobních údajů a právní kontroly.",
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
    "Povinné doplnění",
    [
      "Správce {{DATA_CONTROLLER_LEGAL_NAME}}, {{DATA_CONTROLLER_ADDRESS}}, IČ {{COMPANY_ID}}, kontakt {{PRIVACY_EMAIL}}, pověřenec {{DPO_CONTACT_OR_NOT_APPLICABLE}}. Doplňte účely, tituly, údaje, příjemce, přenosy, doby {{RETENTION_SCHEDULE}}, zpracovatele {{PROCESSOR_REGISTER_URL}}, práva, úřad {{SUPERVISORY_AUTHORITY}} a účinnost {{EFFECTIVE_DATE}}.",
    ]
  ),
  legalTemplate(
    "cookies",
    "Cookies — šablona k doplnění",
    "Šablona musí odpovídat skutečně nasazeným technologiím a nesmí předjímat souhlas.",
    [
      "CONSENT_PLATFORM",
      "COOKIE_INVENTORY_URL",
      "COOKIE_PROVIDERS",
      "COOKIE_DURATIONS",
      "CONSENT_WITHDRAWAL_PATH",
      "EFFECTIVE_DATE",
    ],
    "Povinné doplnění",
    [
      "Správa souhlasu {{CONSENT_PLATFORM}}, inventář {{COOKIE_INVENTORY_URL}}, poskytovatelé {{COOKIE_PROVIDERS}}, doby {{COOKIE_DURATIONS}}, změna souhlasu {{CONSENT_WITHDRAWAL_PATH}}, účinnost {{EFFECTIVE_DATE}}. Doplňte kategorie, účely a právní tituly.",
    ]
  ),
  legalTemplate(
    "returns",
    "Vrácení a odstoupení — šablona k doplnění",
    "Lhůty, výjimky a náklady musí potvrdit provozovatel a právník pro cílový trh.",
    [
      "RETURN_ADDRESS",
      "WITHDRAWAL_PERIOD_DAYS",
      "STATUTORY_EXCEPTIONS",
      "REFUND_DEADLINE_DAYS",
      "RETURN_COST_RULE",
      "COMPLAINT_AUTHORITY",
      "EFFECTIVE_DATE",
    ],
    "Povinné doplnění",
    [
      "Doplňte oznámení, adresu {{RETURN_ADDRESS}}, lhůtu {{WITHDRAWAL_PERIOD_DAYS}}, výjimky {{STATUTORY_EXCEPTIONS}}, refundaci {{REFUND_DEADLINE_DAYS}}, náklady {{RETURN_COST_RULE}}, orgán {{COMPLAINT_AUTHORITY}} a účinnost {{EFFECTIVE_DATE}}.",
    ]
  ),
  legalTemplate(
    "shipping",
    "Doprava — šablona k doplnění",
    "Dopravci, ceny a lhůty musí vycházet z aktuální schválené nabídky provozovatele.",
    [
      "SUPPORTED_COUNTRIES",
      "CARRIERS",
      "SHIPPING_PRICE_TABLE_URL",
      "DISPATCH_TIME",
      "DELIVERY_WINDOWS",
      "DAMAGE_CLAIM_PROCESS",
      "EFFECTIVE_DATE",
    ],
    "Povinné doplnění",
    [
      "Země {{SUPPORTED_COUNTRIES}}, dopravci {{CARRIERS}}, ceny {{SHIPPING_PRICE_TABLE_URL}}, expedice {{DISPATCH_TIME}}, doručení {{DELIVERY_WINDOWS}}, poškození {{DAMAGE_CLAIM_PROCESS}}, účinnost {{EFFECTIVE_DATE}}.",
    ]
  ),
] as const

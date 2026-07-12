export const STOREFRONT_TEXT_STATUSES = ["active", "draft"] as const

export type StorefrontTextStatus = (typeof STOREFRONT_TEXT_STATUSES)[number]

export const STOREFRONT_TEXT_NAMESPACES = ["cart", "checkout"] as const

export type StorefrontTextNamespace =
  (typeof STOREFRONT_TEXT_NAMESPACES)[number]

export const STOREFRONT_TEXT_MARKETS = [
  {
    country: "sk",
    domain: "herbatica.sk",
    label: "Slovensko",
    locale: "sk-SK",
    market: "sk",
  },
  {
    country: "cz",
    domain: "herbatica.cz",
    label: "Česko",
    locale: "cs-CZ",
    market: "cz",
  },
  {
    country: "hu",
    domain: "herbatica.hu",
    label: "Maďarsko",
    locale: "hu-HU",
    market: "hu",
  },
  {
    country: "ro",
    domain: "herbatica.ro",
    label: "Rumunsko",
    locale: "ro-RO",
    market: "ro",
  },
] as const

export type StorefrontTextMarket =
  (typeof STOREFRONT_TEXT_MARKETS)[number]["market"]

export type StorefrontTextLocale =
  (typeof STOREFRONT_TEXT_MARKETS)[number]["locale"]

export const STOREFRONT_TEXT_MARKET_IDS = ["sk", "cz", "hu", "ro"] as const

export const STOREFRONT_TEXT_LOCALES = [
  "sk-SK",
  "cs-CZ",
  "hu-HU",
  "ro-RO",
] as const

type EqualTypes<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

type ExpectTrue<Value extends true> = Value

export type StorefrontTextRegistryAssertions = [
  ExpectTrue<
    EqualTypes<
      StorefrontTextMarket,
      (typeof STOREFRONT_TEXT_MARKET_IDS)[number]
    >
  >,
  ExpectTrue<
    EqualTypes<StorefrontTextLocale, (typeof STOREFRONT_TEXT_LOCALES)[number]>
  >,
]

export type StorefrontTextDefinition = {
  description: string
  key: string
  namespace: StorefrontTextNamespace
  values: Record<StorefrontTextMarket, string>
}

export const STOREFRONT_TEXT_DEFINITIONS = [
  {
    description: "Label tlačítka pro přidání produktu do košíku.",
    key: "cart.add_to_cart",
    namespace: "cart",
    values: {
      cz: "Do košíku",
      hu: "Kosárba",
      ro: "Adaugă în coș",
      sk: "Do košíka",
    },
  },
  {
    description: "Text tlačítka během přidávání produktu do košíku.",
    key: "cart.adding_to_cart",
    namespace: "cart",
    values: {
      cz: "Přidávám...",
      hu: "Hozzáadás...",
      ro: "Se adaugă...",
      sk: "Pridávam...",
    },
  },
  {
    description: "Toast po úspěšném přidání produktu do košíku.",
    key: "cart.added_to_cart",
    namespace: "cart",
    values: {
      cz: "Produkt byl přidán do košíku.",
      hu: "A termék a kosárba került.",
      ro: "Produsul a fost adăugat în coș.",
      sk: "Produkt bol pridaný do košíka.",
    },
  },
  {
    description: "Chybová hláška při neúspěšném přidání do košíku.",
    key: "cart.failed",
    namespace: "cart",
    values: {
      cz: "Přidání do košíku selhalo.",
      hu: "A kosárba helyezés nem sikerült.",
      ro: "Adăugarea în coș a eșuat.",
      sk: "Pridanie do košíka zlyhalo.",
    },
  },
  {
    description: "Chybová hláška pro nedostatečné skladové množství.",
    key: "cart.insufficient_quantity",
    namespace: "cart",
    values: {
      cz: "Nedostatečné množství produktu.",
      hu: "Nincs elegendő mennyiség a termékből.",
      ro: "Cantitate insuficientă pentru produs.",
      sk: "Nedostatočné množstvo produktu.",
    },
  },
  {
    description:
      "Chybová hláška pro nedostatečné množství s dostupným množstvím.",
    key: "cart.insufficient_quantity_available",
    namespace: "cart",
    values: {
      cz: "Nedostatečné množství produktu. Dostupné množství: {availableQuantity} ks.",
      hu: "Nincs elegendő mennyiség a termékből. Elérhető mennyiség: {availableQuantity} db.",
      ro: "Cantitate insuficientă pentru produs. Cantitate disponibilă: {availableQuantity} buc.",
      sk: "Nedostatočné množstvo produktu. Dostupné množstvo: {availableQuantity} ks.",
    },
  },
  {
    description:
      "Chybová hláška pro nedostatečné množství s množstvím v košíku.",
    key: "cart.insufficient_quantity_in_cart",
    namespace: "cart",
    values: {
      cz: "Nedostatečné množství produktu. V košíku už máte {cartQuantity} ks, dostupné množství je {availableQuantity} ks.",
      hu: "Nincs elegendő mennyiség a termékből. A kosárban már {cartQuantity} db van, elérhető mennyiség: {availableQuantity} db.",
      ro: "Cantitate insuficientă pentru produs. Ai deja {cartQuantity} buc. în coș, cantitatea disponibilă este {availableQuantity} buc.",
      sk: "Nedostatočné množstvo produktu. V košíku už máte {cartQuantity} ks, dostupné množstvo je {availableQuantity} ks.",
    },
  },
  {
    description: "Chybová hláška při načítání regionu košíku.",
    key: "cart.missing_region",
    namespace: "cart",
    values: {
      cz: "Region se ještě načítá. Zkuste to prosím za chvíli.",
      hu: "A régió még betöltődik. Kérjük, próbáld újra később.",
      ro: "Regiunea încă se încarcă. Te rugăm să încerci din nou în câteva momente.",
      sk: "Región sa ešte načítava. Skúste to prosím o chvíľu.",
    },
  },
  {
    description: "Chybová hláška pro produkt bez dostupné varianty.",
    key: "cart.missing_variant",
    namespace: "cart",
    values: {
      cz: "Produkt nemá dostupnou variantu pro přidání do košíku.",
      hu: "A terméknek nincs kosárba tehető elérhető változata.",
      ro: "Produsul nu are o variantă disponibilă pentru adăugare în coș.",
      sk: "Produkt nemá dostupnú variantu na pridanie do košíka.",
    },
  },
  {
    description: "Chybová hláška pro produkt bez skladové dostupnosti.",
    key: "cart.out_of_stock",
    namespace: "cart",
    values: {
      cz: "Produkt momentálně není skladem.",
      hu: "A termék jelenleg nincs készleten.",
      ro: "Produsul nu este momentan în stoc.",
      sk: "Produkt momentálne nie je skladom.",
    },
  },
  {
    description: "Chybová hláška pro produkt nedostupný ve vybraném regionu.",
    key: "cart.unavailable_in_region",
    namespace: "cart",
    values: {
      cz: "Produkt momentálně není dostupný pro vybraný region.",
      hu: "A termék jelenleg nem elérhető a kiválasztott régióban.",
      ro: "Produsul nu este momentan disponibil pentru regiunea selectată.",
      sk: "Produkt nie je momentálne dostupný pre vybraný región.",
    },
  },
  {
    description: "Text počtu dalších položek skrytých v mini košíku.",
    key: "cart.additional_items",
    namespace: "cart",
    values: {
      cz: "Další položky v košíku: {count}",
      hu: "További tételek a kosárban: {count}",
      ro: "Alte articole în coș: {count}",
      sk: "Ďalšie položky v košíku: {count}",
    },
  },
  {
    description: "Label tlačítka pro pokračování z mini košíku k pokladně.",
    key: "cart.continue_to_checkout",
    namespace: "cart",
    values: {
      cz: "Pokračovat k pokladně",
      hu: "Tovább a pénztárhoz",
      ro: "Continuă la finalizarea comenzii",
      sk: "Pokračovať k pokladni",
    },
  },
  {
    description: "Label slevy v souhrnu košíku.",
    key: "cart.discount",
    namespace: "cart",
    values: {
      cz: "Sleva",
      hu: "Kedvezmény",
      ro: "Reducere",
      sk: "Zľava",
    },
  },
  {
    description: "Doplňující text prázdného mini košíku.",
    key: "cart.empty_description",
    namespace: "cart",
    values: {
      cz: "Produkty můžete přidat z katalogu.",
      hu: "A katalógusból adhatsz hozzá termékeket.",
      ro: "Poți adăuga produse din catalog.",
      sk: "Produkty môžete pridať z katalógu.",
    },
  },
  {
    description: "Titulek prázdného mini košíku.",
    key: "cart.empty_title",
    namespace: "cart",
    values: {
      cz: "Váš košík je prázdný",
      hu: "A kosarad üres",
      ro: "Coșul tău este gol",
      sk: "Váš košík je prázdny",
    },
  },
  {
    description: "Upozornění na nízké skladové množství položky.",
    key: "cart.low_stock",
    namespace: "cart",
    values: {
      cz: "Zbývá už jen {quantity} ks",
      hu: "Már csak {quantity} db maradt",
      ro: "Au mai rămas doar {quantity} buc.",
      sk: "Zostáva už len {quantity} ks",
    },
  },
  {
    description: "Label ceny produktů bez daně v souhrnu košíku.",
    key: "cart.products_subtotal_excl_tax",
    namespace: "cart",
    values: {
      cz: "Cena produktů bez DPH",
      hu: "Termékek ára ÁFA nélkül",
      ro: "Prețul produselor fără TVA",
      sk: "Cena produktov bez DPH",
    },
  },
  {
    description: "Přístupný label pole pro množství položky.",
    key: "cart.quantity_aria",
    namespace: "cart",
    values: {
      cz: "Množství pro {itemName}",
      hu: "Mennyiség ehhez: {itemName}",
      ro: "Cantitate pentru {itemName}",
      sk: "Množstvo pre {itemName}",
    },
  },
  {
    description: "Chybová hláška při odstranění položky z košíku.",
    key: "cart.remove_failed",
    namespace: "cart",
    values: {
      cz: "Odstranění položky selhalo.",
      hu: "A tétel eltávolítása nem sikerült.",
      ro: "Eliminarea articolului a eșuat.",
      sk: "Odstránenie položky zlyhalo.",
    },
  },
  {
    description: "Přístupný label tlačítka pro odstranění položky.",
    key: "cart.remove_item_aria",
    namespace: "cart",
    values: {
      cz: "Odstranit {itemName} z košíku",
      hu: "A(z) {itemName} eltávolítása a kosárból",
      ro: "Elimină {itemName} din coș",
      sk: "Odstrániť {itemName} z košíka",
    },
  },
  {
    description: "Label dopravy bez daně v souhrnu košíku.",
    key: "cart.shipping_excl_tax",
    namespace: "cart",
    values: {
      cz: "Doprava bez DPH",
      hu: "Szállítás ÁFA nélkül",
      ro: "Livrare fără TVA",
      sk: "Doprava bez DPH",
    },
  },
  {
    description: "Label daně v souhrnu košíku.",
    key: "cart.tax",
    namespace: "cart",
    values: {
      cz: "DPH",
      hu: "ÁFA",
      ro: "TVA",
      sk: "DPH",
    },
  },
  {
    description: "Titulek košíku bez počtu položek.",
    key: "cart.title",
    namespace: "cart",
    values: {
      cz: "Košík",
      hu: "Kosár",
      ro: "Coș",
      sk: "Košík",
    },
  },
  {
    description: "Titulek košíku s počtem položek.",
    key: "cart.title_with_count",
    namespace: "cart",
    values: {
      cz: "Košík ({count})",
      hu: "Kosár ({count})",
      ro: "Coș ({count})",
      sk: "Košík ({count})",
    },
  },
  {
    description: "Label celkové ceny s daní v souhrnu košíku.",
    key: "cart.total_incl_tax",
    namespace: "cart",
    values: {
      cz: "Celkem s DPH",
      hu: "Összesen ÁFÁ-val",
      ro: "Total cu TVA",
      sk: "Spolu s DPH",
    },
  },
  {
    description: "Chybová hláška při úpravě množství v košíku.",
    key: "cart.update_failed",
    namespace: "cart",
    values: {
      cz: "Úprava košíku selhala.",
      hu: "A kosár frissítése nem sikerült.",
      ro: "Actualizarea coșului a eșuat.",
      sk: "Úprava košíka zlyhala.",
    },
  },
  {
    description: "Navigace zpět do košíku.",
    key: "checkout.back_to_cart",
    namespace: "checkout",
    values: {
      cz: "Zpět do košíku",
      hu: "Vissza a kosárhoz",
      ro: "Înapoi la coș",
      sk: "Späť na košík",
    },
  },
  {
    description: "Navigace zpět na dopravu a platbu.",
    key: "checkout.back_to_shipping_payment",
    namespace: "checkout",
    values: {
      cz: "Zpět k dopravě a platbě",
      hu: "Vissza a szállításhoz és fizetéshez",
      ro: "Înapoi la livrare și plată",
      sk: "Späť na dopravu a platbu",
    },
  },
  {
    description: "Tlačítko pro dokončení objednávky.",
    key: "checkout.complete_order",
    namespace: "checkout",
    values: {
      cz: "Dokončit objednávku",
      hu: "Rendelés befejezése",
      ro: "Finalizează comanda",
      sk: "Dokončiť objednávku",
    },
  },
  {
    description: "Přístupný popisek dokončeného kroku checkoutu.",
    key: "checkout.completed_aria",
    namespace: "checkout",
    values: {
      cz: "Dokončeno",
      hu: "Befejezve",
      ro: "Finalizat",
      sk: "Dokončené",
    },
  },
  {
    description: "Navigace k zákaznickým údajům.",
    key: "checkout.continue_to_customer_details",
    namespace: "checkout",
    values: {
      cz: "Pokračovat k vašim údajům",
      hu: "Tovább az adatokhoz",
      ro: "Continuă la datele dvs.",
      sk: "Pokračovať na vaše údaje",
    },
  },
  {
    description: "Navigace k dopravě a platbě.",
    key: "checkout.continue_to_shipping_payment",
    namespace: "checkout",
    values: {
      cz: "Pokračovat k dopravě a platbě",
      hu: "Tovább a szállításhoz és fizetéshez",
      ro: "Continuă la livrare și plată",
      sk: "Pokračovať na dopravu a platbu",
    },
  },
  {
    description: "Navigace k souhrnu objednávky.",
    key: "checkout.continue_to_summary",
    namespace: "checkout",
    values: {
      cz: "Pokračovat k souhrnu",
      hu: "Tovább az összegzéshez",
      ro: "Continuă la sumar",
      sk: "Pokračovať na súhrn",
    },
  },
  {
    description: "Název kroku a sekce zákaznických údajů.",
    key: "checkout.customer_details",
    namespace: "checkout",
    values: {
      cz: "Vaše údaje",
      hu: "Az Ön adatai",
      ro: "Datele dvs.",
      sk: "Vaše údaje",
    },
  },
  {
    description: "Label akce pro úpravu části objednávky.",
    key: "checkout.edit",
    namespace: "checkout",
    values: {
      cz: "Upravit",
      hu: "Szerkesztés",
      ro: "Editează",
      sk: "Upraviť",
    },
  },
  {
    description: "Label bezplatné dopravy nebo platby.",
    key: "checkout.free",
    namespace: "checkout",
    values: {
      cz: "Zdarma",
      hu: "Ingyenes",
      ro: "Gratuit",
      sk: "Zadarmo",
    },
  },
  {
    description: "Formát množství položky v souhrnu objednávky.",
    key: "checkout.item_quantity",
    namespace: "checkout",
    values: {
      cz: "{quantity} ks",
      hu: "{quantity} db",
      ro: "{quantity} buc.",
      sk: "{quantity} ks",
    },
  },
  {
    description: "Prázdný stav dostupných platebních metod.",
    key: "checkout.no_payment_methods",
    namespace: "checkout",
    values: {
      cz: "Nejsou dostupné žádné platební metody.",
      hu: "Nincsenek elérhető fizetési módok.",
      ro: "Nu există metode de plată disponibile.",
      sk: "Nie sú dostupné žiadne platobné metódy.",
    },
  },
  {
    description: "Prázdný stav dostupných možností dopravy.",
    key: "checkout.no_shipping_options",
    namespace: "checkout",
    values: {
      cz: "Nejsou dostupné žádné možnosti dopravy.",
      hu: "Nincsenek elérhető szállítási lehetőségek.",
      ro: "Nu există opțiuni de livrare disponibile.",
      sk: "Nie sú dostupné žiadne možnosti dopravy.",
    },
  },
  {
    description: "Nadpis finálního souhrnu objednávky.",
    key: "checkout.order_summary",
    namespace: "checkout",
    values: {
      cz: "Souhrn objednávky",
      hu: "Rendelés összegzése",
      ro: "Sumarul comenzii",
      sk: "Súhrn objednávky",
    },
  },
  {
    description: "Label platby v checkoutu.",
    key: "checkout.payment",
    namespace: "checkout",
    values: {
      cz: "Platba",
      hu: "Fizetés",
      ro: "Plată",
      sk: "Platba",
    },
  },
  {
    description: "Stav, kdy není vybraná platba.",
    key: "checkout.payment_not_selected",
    namespace: "checkout",
    values: {
      cz: "Platba není vybrána",
      hu: "Nincs kiválasztva fizetési mód",
      ro: "Plata nu este selectată",
      sk: "Platba nie je vybraná",
    },
  },
  {
    description: "Instrukce k dokončení výběru výdejního místa.",
    key: "checkout.pickup_selection_required",
    namespace: "checkout",
    values: {
      cz: "Vyberte výdejní místo, aby se odemkla platba.",
      hu: "Válasszon átvételi pontot a fizetés feloldásához.",
      ro: "Selectați un punct de ridicare pentru a debloca plata.",
      sk: "Vyberte výdajné miesto, aby sa odomkla platba.",
    },
  },
  {
    description: "Výzva k výběru výdejního místa před platbou.",
    key: "checkout.select_pickup_before_payment",
    namespace: "checkout",
    values: {
      cz: "Pro výběr platby nejprve vyberte výdejní místo.",
      hu: "A fizetés kiválasztása előtt válasszon átvételi pontot.",
      ro: "Pentru a selecta plata, alegeți mai întâi un punct de ridicare.",
      sk: "Pre voľbu platby najprv vyberte výdajné miesto.",
    },
  },
  {
    description: "Výzva k výběru dopravy před platbou.",
    key: "checkout.select_shipping_before_payment",
    namespace: "checkout",
    values: {
      cz: "Pro výběr platby nejprve vyberte dopravu.",
      hu: "A fizetés kiválasztása előtt válasszon szállítási módot.",
      ro: "Pentru a selecta plata, alegeți mai întâi livrarea.",
      sk: "Pre voľbu platby najprv vyberte dopravu.",
    },
  },
  {
    description: "Výchozí label zvolené platby.",
    key: "checkout.selected_payment",
    namespace: "checkout",
    values: {
      cz: "Vybraná platba",
      hu: "Kiválasztott fizetés",
      ro: "Plată selectată",
      sk: "Zvolená platba",
    },
  },
  {
    description: "Výchozí label zvolené dopravy.",
    key: "checkout.selected_shipping",
    namespace: "checkout",
    values: {
      cz: "Vybraná doprava",
      hu: "Kiválasztott szállítás",
      ro: "Livrare selectată",
      sk: "Zvolená doprava",
    },
  },
  {
    description: "Label dopravy v checkoutu.",
    key: "checkout.shipping",
    namespace: "checkout",
    values: {
      cz: "Doprava",
      hu: "Szállítás",
      ro: "Livrare",
      sk: "Doprava",
    },
  },
  {
    description: "Label zvolené dopravy bez daně.",
    key: "checkout.shipping_excl_tax_with_name",
    namespace: "checkout",
    values: {
      cz: "{shippingName} bez DPH",
      hu: "{shippingName} ÁFA nélkül",
      ro: "{shippingName} fără TVA",
      sk: "{shippingName} bez DPH",
    },
  },
  {
    description: "Stav, kdy není vybraná doprava.",
    key: "checkout.shipping_not_selected",
    namespace: "checkout",
    values: {
      cz: "Doprava není vybrána",
      hu: "Nincs kiválasztva szállítási mód",
      ro: "Livrarea nu este selectată",
      sk: "Doprava nie je vybraná",
    },
  },
  {
    description: "Název kroku souhrnu checkoutu.",
    key: "checkout.summary",
    namespace: "checkout",
    values: {
      cz: "Souhrn",
      hu: "Összegzés",
      ro: "Sumar",
      sk: "Súhrn",
    },
  },
  {
    description: "Label celkové ceny bez daně.",
    key: "checkout.total_excl_tax",
    namespace: "checkout",
    values: {
      cz: "bez DPH",
      hu: "ÁFA nélkül",
      ro: "fără TVA",
      sk: "bez DPH",
    },
  },
  {
    description: "Název kroku dopravy a platby.",
    key: "checkout.shipping_payment",
    namespace: "checkout",
    values: {
      cz: "Doprava a platba",
      hu: "Szállítás és fizetés",
      ro: "Livrare și plată",
      sk: "Doprava a platba",
    },
  },
  {
    description: "Chybová hláška pro prázdný košík v checkoutu.",
    key: "checkout.cart_empty",
    namespace: "checkout",
    values: {
      cz: "Košík je prázdný. Nejprve přidejte produkty.",
      hu: "A kosár üres. Először adjon hozzá termékeket.",
      ro: "Coșul este gol. Adăugați mai întâi produse.",
      sk: "Košík je prázdny. Pridajte najprv produkty.",
    },
  },
  {
    description: "Chybová hláška pro nepřipravený košík.",
    key: "checkout.cart_not_ready",
    namespace: "checkout",
    values: {
      cz: "Košík ještě není připraven.",
      hu: "A kosár még nem áll készen.",
      ro: "Coșul nu este încă pregătit.",
      sk: "Košík nie je pripravený.",
    },
  },
  {
    description: "Chybová hláška při neúspěšném dokončení objednávky.",
    key: "checkout.complete_failed",
    namespace: "checkout",
    values: {
      cz: "Dokončení objednávky selhalo.",
      hu: "A rendelés befejezése sikertelen.",
      ro: "Finalizarea comenzii a eșuat.",
      sk: "Dokončenie objednávky zlyhalo.",
    },
  },
  {
    description: "Chybová hláška při neúspěšném nastavení platby.",
    key: "checkout.payment_update_failed",
    namespace: "checkout",
    values: {
      cz: "Nastavení platby selhalo.",
      hu: "A fizetés beállítása sikertelen.",
      ro: "Setarea plății a eșuat.",
      sk: "Nastavenie platby zlyhalo.",
    },
  },
  {
    description: "Výzva k výběru platby před dokončením objednávky.",
    key: "checkout.select_payment_before_completion",
    namespace: "checkout",
    values: {
      cz: "Před dokončením objednávky vyberte platební metodu.",
      hu: "A rendelés befejezése előtt válasszon fizetési módot.",
      ro: "Selectați metoda de plată înainte de finalizarea comenzii.",
      sk: "Vyberte platobnú metódu pred dokončením objednávky.",
    },
  },
  {
    description: "Výzva k výběru dopravy před dokončením objednávky.",
    key: "checkout.select_shipping_before_completion",
    namespace: "checkout",
    values: {
      cz: "Před dokončením objednávky vyberte dopravu.",
      hu: "A rendelés befejezése előtt válasszon szállítási módot.",
      ro: "Selectați livrarea înainte de finalizarea comenzii.",
      sk: "Vyberte dopravu pred dokončením objednávky.",
    },
  },
  {
    description: "Chybová hláška při neúspěšném nastavení dopravy.",
    key: "checkout.shipping_update_failed",
    namespace: "checkout",
    values: {
      cz: "Nastavení dopravy selhalo.",
      hu: "A szállítás beállítása sikertelen.",
      ro: "Setarea livrării a eșuat.",
      sk: "Nastavenie dopravy zlyhalo.",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]

export type StorefrontTextKey =
  (typeof STOREFRONT_TEXT_DEFINITIONS)[number]["key"]

export type StorefrontTextMessages = Partial<Record<StorefrontTextKey, string>>

export type StorefrontTextSeedRow = {
  country: string
  description: string
  domain: string
  key: StorefrontTextKey
  locale: StorefrontTextLocale
  market: StorefrontTextMarket
  namespace: StorefrontTextNamespace
  status: StorefrontTextStatus
  value: string
}

export const getStorefrontTextSeedRows = (): StorefrontTextSeedRow[] =>
  STOREFRONT_TEXT_DEFINITIONS.flatMap((definition) =>
    STOREFRONT_TEXT_MARKETS.map((market) => ({
      country: market.country,
      description: definition.description,
      domain: market.domain,
      key: definition.key,
      locale: market.locale,
      market: market.market,
      namespace: definition.namespace,
      status: "active",
      value: definition.values[market.market],
    }))
  )

export const getStorefrontTextDefaultMessages = ({
  market,
  namespace,
}: {
  market: StorefrontTextMarket
  namespace?: StorefrontTextNamespace
}): StorefrontTextMessages => {
  const messages: StorefrontTextMessages = {}

  for (const definition of STOREFRONT_TEXT_DEFINITIONS) {
    if (namespace && definition.namespace !== namespace) {
      continue
    }

    messages[definition.key] = definition.values[market]
  }

  return messages
}
